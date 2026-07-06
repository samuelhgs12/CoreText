from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DB_PATH = Path(__file__).resolve().parent.parent / "coretext.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401  garante que os modelos sejam registrados em Base

    Base.metadata.create_all(bind=engine)
    _ensure_user_auth_columns()
    _ensure_pdf_file_metadata_columns()


def _ensure_user_auth_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    statements = []
    if "full_name" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN full_name VARCHAR(255)")
    if "email" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN email VARCHAR(255)")
    if "password_hash" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)")
    if "password_salt" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN password_salt VARCHAR(64)")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_pdf_file_metadata_columns() -> None:
    inspector = inspect(engine)
    if "pdf_files" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("pdf_files")}
    statements = []
    if "content_type" not in existing_columns:
        statements.append(
            "ALTER TABLE pdf_files "
            "ADD COLUMN content_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf'"
        )
    if "file_size_bytes" not in existing_columns:
        statements.append(
            "ALTER TABLE pdf_files ADD COLUMN file_size_bytes INTEGER NOT NULL DEFAULT 0"
        )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
