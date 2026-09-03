from fastapi import FastAPI

app = FastAPI(title="Cue API")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
