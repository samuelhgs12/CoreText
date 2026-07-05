"""Rota provisória de criação de usuário.

PLACEHOLDER: substitui o fluxo real de cadastro/login enquanto a issue de
autenticação não é implementada. Serve apenas para permitir testar o fluxo
de upload e resumo de PDFs associados a um usuário.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.schemas import UserCreate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Nome de usuário já existe."
        )

    user = User(username=payload.username)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
