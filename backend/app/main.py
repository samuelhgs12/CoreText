from fastapi import FastAPI

app = FastAPI(title="CoreText API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
