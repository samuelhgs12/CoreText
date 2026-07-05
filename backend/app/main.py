from fastapi import FastAPI

from app.db import init_db
from app.routers import files, integrated_summaries, summaries, users

init_db()

app = FastAPI(title="CoreText API")

app.include_router(users.router)
app.include_router(files.router)
app.include_router(summaries.router)
app.include_router(integrated_summaries.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
