import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import PDFFile, User
from app.schemas import FileOut

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024
PDF_CONTENT_TYPE = "application/pdf"
PDF_SIGNATURE = b"%PDF"
CHUNK_SIZE_BYTES = 1024 * 1024

router = APIRouter(prefix="/files", tags=["files"])


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
