from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """Usuário da aplicação.

    Provisório: sem senha/credenciais reais, pois a autenticação definitiva
    ainda não foi implementada por outra parte do time.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    files: Mapped[list["PDFFile"]] = relationship(back_populates="owner")


class PDFFile(Base):
    """Arquivo PDF enviado por um usuário."""

    __tablename__ = "pdf_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    filepath: Mapped[str] = mapped_column(String(1024), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    owner: Mapped["User"] = relationship(back_populates="files")
    summaries: Mapped[list["Summary"]] = relationship(back_populates="file")


class Summary(Base):
    """Resumo gerado pela LLM para um PDFFile."""

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_id: Mapped[int] = mapped_column(ForeignKey("pdf_files.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    generation_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    file: Mapped["PDFFile"] = relationship(back_populates="summaries")
