import uuid
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import PDFFile, Summary, User, integrated_summary_files
from app.schemas import FileOut

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024
PDF_CONTENT_TYPE = "application/pdf"
PDF_SIGNATURE = b"%PDF"
CHUNK_SIZE_BYTES = 1024 * 1024

router = APIRouter(prefix="/files", tags=["files"])


def _get_file_or_404(file_id: int, db: Session) -> PDFFile:
    pdf_file = db.get(PDFFile, file_id)
    if pdf_file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado."
        )
    return pdf_file


def _ensure_file_owner(pdf_file: PDFFile, current_user: User) -> None:
    if pdf_file.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar este arquivo.",
        )


def _get_existing_pdf_path(pdf_file: PDFFile) -> Path:
    filepath = Path(pdf_file.filepath)

    if not filepath.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo físico não encontrado no servidor.",
        )

    return filepath


def _content_disposition(kind: str, filename: str) -> str:
    return f"{kind}; filename*=UTF-8''{quote(filename)}"


def _validate_pdf_metadata(file: UploadFile) -> None:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas arquivos .pdf são aceitos."
        )

    if file.content_type != PDF_CONTENT_TYPE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de arquivo inválido. Envie um PDF com content-type application/pdf.",
        )


def _save_pdf_with_size_limit(file: UploadFile, destination: Path) -> int:
    total_size = 0

    try:
        with destination.open("wb") as buffer:
            first_chunk = file.file.read(CHUNK_SIZE_BYTES)
            if not first_chunk.startswith(PDF_SIGNATURE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Arquivo inválido. O conteúdo enviado não parece ser um PDF.",
                )

            while first_chunk:
                total_size += len(first_chunk)
                if total_size > MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Arquivo excede o tamanho máximo de 50 MB.",
                    )

                buffer.write(first_chunk)
                first_chunk = file.file.read(CHUNK_SIZE_BYTES)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise

    return total_size


@router.post("", response_model=FileOut, status_code=status.HTTP_201_CREATED)
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PDFFile:
    _validate_pdf_metadata(file)

    stored_name = f"{uuid.uuid4().hex}.pdf"
    destination = UPLOAD_DIR / stored_name
    file_size_bytes = _save_pdf_with_size_limit(file, destination)

    pdf_file = PDFFile(
        filename=file.filename,
        filepath=str(destination),
        content_type=PDF_CONTENT_TYPE,
        file_size_bytes=file_size_bytes,
        owner_id=current_user.id,
    )
    db.add(pdf_file)
    try:
        db.commit()
    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise

    db.refresh(pdf_file)
    return pdf_file


@router.get("", response_model=list[FileOut])
def list_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PDFFile]:
    return (
        db.query(PDFFile)
        .filter(PDFFile.owner_id == current_user.id)
        .order_by(PDFFile.uploaded_at.desc(), PDFFile.id.desc())
        .all()
    )


@router.get("/{file_id}", response_model=FileOut)
def get_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PDFFile:
    pdf_file = _get_file_or_404(file_id, db)
    _ensure_file_owner(pdf_file, current_user)
    return pdf_file


@router.get("/{file_id}/content")
def view_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    pdf_file = _get_file_or_404(file_id, db)
    _ensure_file_owner(pdf_file, current_user)

    return FileResponse(
        _get_existing_pdf_path(pdf_file),
        media_type=PDF_CONTENT_TYPE,
        headers={"Content-Disposition": _content_disposition("inline", pdf_file.filename)},
    )


@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    pdf_file = _get_file_or_404(file_id, db)
    _ensure_file_owner(pdf_file, current_user)

    return FileResponse(
        _get_existing_pdf_path(pdf_file),
        media_type=PDF_CONTENT_TYPE,
        headers={"Content-Disposition": _content_disposition("attachment", pdf_file.filename)},
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    pdf_file = _get_file_or_404(file_id, db)
    _ensure_file_owner(pdf_file, current_user)
    filepath = Path(pdf_file.filepath)

    db.execute(
        integrated_summary_files.delete().where(integrated_summary_files.c.file_id == file_id)
    )
    db.query(Summary).filter(Summary.file_id == file_id).delete(synchronize_session=False)
    db.delete(pdf_file)
    db.commit()

    filepath.unlink(missing_ok=True)
