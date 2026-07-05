"""Rota provisória de upload de arquivos PDF.

PLACEHOLDER: uma versão mínima de upload, apenas o suficiente para associar
um PDF a um usuário dono e permitir testar a geração de resumo (issue 12).
Deve ser reconciliada com a issue de upload/armazenamento de arquivos quando
essa parte do time a implementar.
"""

import shutil
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

router = APIRouter(prefix="/files", tags=["files"])


@router.post("", response_model=FileOut, status_code=status.HTTP_201_CREATED)
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PDFFile:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas arquivos PDF são aceitos."
        )

    stored_name = f"{uuid.uuid4().hex}.pdf"
    destination = UPLOAD_DIR / stored_name
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    pdf_file = PDFFile(filename=file.filename, filepath=str(destination), owner_id=current_user.id)
    db.add(pdf_file)
    db.commit()
    db.refresh(pdf_file)
    return pdf_file
