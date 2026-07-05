"""Autenticação provisória.

PLACEHOLDER: ainda não existe um mecanismo real de login/token no projeto.
Este módulo identifica o "usuário autenticado" a partir do header `X-User-Id`
apenas para permitir que as rotas de arquivos/resumos apliquem verificação de
propriedade (dono do arquivo) enquanto a autenticação definitiva não é
implementada. Substituir `get_current_user` pela integração real (ex.: JWT)
quando essa issue for concluída — as rotas que dependem dele não deverão
precisar mudar, apenas esta função.
"""

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User


def get_current_user(
    x_user_id: int = Header(
        ...,
        alias="X-User-Id",
        description="ID do usuário autenticado (placeholder provisório de autenticação)",
    ),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, x_user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado/autenticado.",
        )
    return user
