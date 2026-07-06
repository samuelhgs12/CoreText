"""Rotas reais de autenticação."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    normalize_email,
    verify_password,
)
from app.db import get_db
from app.models import User
from app.schemas import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    ProfileUpdateRequest,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: AuthRegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    normalized_email = normalize_email(payload.email)

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma conta cadastrada com este e-mail.",
        )

    password_hash, password_salt = hash_password(payload.password)
    user = User(
        username=normalized_email,
        full_name=payload.full_name.strip(),
        email=normalized_email,
        password_hash=password_hash,
        password_salt=password_salt,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _build_auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login_user(payload: AuthLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    normalized_email = normalize_email(payload.email)
    user = db.query(User).filter(User.email == normalized_email).first()

    if user is None or user.password_hash is None or user.password_salt is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
        )

    if not verify_password(payload.password, user.password_hash, user.password_salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
        )

    return _build_auth_response(user)


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserOut)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if payload.full_name is None and payload.email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie ao menos um campo para atualizar o perfil.",
        )

    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()

    if payload.email is not None:
        normalized_email = normalize_email(payload.email)
        existing_user = (
            db.query(User)
            .filter(User.email == normalized_email, User.id != current_user.id)
            .first()
        )
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe uma conta cadastrada com este e-mail.",
            )

        current_user.email = normalized_email
        current_user.username = normalized_email

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user