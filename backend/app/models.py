from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """Usuário da aplicação.

    Mantém `username` para compatibilidade com o fluxo legado dos testes, mas
    já armazena credenciais reais para o sistema de autenticação.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_salt: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    files: Mapped[list["PDFFile"]] = relationship(back_populates="owner")


class PDFFile(Base):
    """Arquivo PDF enviado por um usuário."""

    __tablename__ = "pdf_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    filepath: Mapped[str] = mapped_column(String(1024), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False, default="application/pdf")
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    owner: Mapped["User"] = relationship(back_populates="files")
    summaries: Mapped[list["Summary"]] = relationship(back_populates="file")


class Summary(Base):
    """Resumo individual gerado pela LLM para um único PDFFile (issue 12)."""

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_id: Mapped[int] = mapped_column(ForeignKey("pdf_files.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    generation_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    file: Mapped["PDFFile"] = relationship(back_populates="summaries")


integrated_summary_files = Table(
    "integrated_summary_files",
    Base.metadata,
    Column("integrated_summary_id", ForeignKey("integrated_summaries.id"), primary_key=True),
    Column("file_id", ForeignKey("pdf_files.id"), primary_key=True),
)


class IntegratedSummary(Base):
    """Resumo consolidado gerado pela LLM a partir de múltiplos PDFFiles (issue 13)."""

    __tablename__ = "integrated_summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    generation_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    files: Mapped[list["PDFFile"]] = relationship(secondary=integrated_summary_files)

    @property
    def file_ids(self) -> list[int]:
        return [f.id for f in self.files]
