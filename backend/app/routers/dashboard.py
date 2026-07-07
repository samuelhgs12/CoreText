from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import IntegratedSummary, PDFFile, Summary, User, integrated_summary_files
from app.schemas import DashboardOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _format_size(bytes_count: int) -> str:
    if bytes_count <= 0:
        return "0 KB"

    units = ["B", "KB", "MB", "GB"]
    size = float(bytes_count)
    unit_index = 0

    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1

    value = f"{size:.1f}" if size < 10 and unit_index > 0 else f"{size:.0f}"
    return f"{value.replace('.', ',')} {units[unit_index]}"


def _summary_excerpt(content: str) -> str:
    normalized = " ".join(content.split())

    if len(normalized) <= 42:
        return normalized

    return f"{normalized[:42].rstrip()}..."


@router.get("", response_model=DashboardOut)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    files_query = db.query(PDFFile).filter(PDFFile.owner_id == current_user.id)
    total_files = files_query.count()
    storage_used = files_query.with_entities(
        func.coalesce(func.sum(PDFFile.file_size_bytes), 0)
    ).scalar()

    individual_summaries_query = (
        db.query(Summary)
        .join(PDFFile, Summary.file_id == PDFFile.id)
        .filter(PDFFile.owner_id == current_user.id)
    )
    individual_summaries_count = individual_summaries_query.count()

    integrated_summaries_query = (
        db.query(IntegratedSummary)
        .join(
            integrated_summary_files,
            IntegratedSummary.id == integrated_summary_files.c.integrated_summary_id,
        )
        .join(PDFFile, integrated_summary_files.c.file_id == PDFFile.id)
        .filter(PDFFile.owner_id == current_user.id)
        .distinct()
    )
    integrated_summaries_count = integrated_summaries_query.count()
    total_summaries = individual_summaries_count + integrated_summaries_count

    individual_recent = (
        individual_summaries_query.order_by(Summary.created_at.desc(), Summary.id.desc())
        .limit(4)
        .all()
    )
    integrated_recent = (
        integrated_summaries_query.order_by(
            IntegratedSummary.created_at.desc(), IntegratedSummary.id.desc()
        )
        .limit(4)
        .all()
    )

    recent_summaries = [
        {
            "id": f"individual-{summary.id}",
            "file": summary.file.filename,
            "details": _format_size(summary.file.file_size_bytes),
            "summary": _summary_excerpt(summary.content),
            "status": "Concluído",
            "date": summary.created_at,
            "type": "individual",
        }
        for summary in individual_recent
    ]

    recent_summaries.extend(
        {
            "id": f"integrated-{summary.id}",
            "file": f"{len(summary.files)} arquivos",
            "details": ", ".join(file.filename for file in summary.files[:2])
            + ("..." if len(summary.files) > 2 else ""),
            "summary": _summary_excerpt(summary.content),
            "status": "Concluído",
            "date": summary.created_at,
            "type": "integrated",
        }
        for summary in integrated_recent
    )

    recent_summaries.sort(key=lambda item: item["date"], reverse=True)

    return {
        "metrics": [
            {
                "label": "PDFs enviados",
                "value": str(total_files),
                "hint": "",
                "icon": "fileText",
                "variant": "blue",
            },
            {
                "label": "Resumos gerados",
                "value": str(total_summaries),
                "hint": "",
                "icon": "sparkles",
                "variant": "green",
            },
            {
                "label": "Resumos integrados",
                "value": str(integrated_summaries_count),
                "hint": "",
                "icon": "archive",
                "variant": "purple",
            },
            {
                "label": "Armazenamento",
                "value": _format_size(int(storage_used or 0)),
                "hint": "",
                "icon": "refresh",
                "variant": "orange",
            },
        ],
        "recent_summaries": recent_summaries[:3],
    }
