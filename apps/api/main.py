from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.session import (
    CreateSessionResponse,
    InterviewSession,
    ProblemContext,
    SessionEvent,
)
from sessions.manager import SessionEndedError, SessionManager, SessionNotFoundError

app = FastAPI(title="Cue API")
sessions = SessionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sessions", status_code=201)
async def create_session(problem: ProblemContext) -> CreateSessionResponse:
    session = sessions.create(problem)
    return CreateSessionResponse(sessionId=session.id)


@app.get("/sessions/{session_id}")
async def get_session(session_id: str) -> InterviewSession:
    try:
        return sessions.get(session_id)
    except SessionNotFoundError as error:
        raise HTTPException(status_code=404, detail="Session not found") from error


@app.post("/sessions/{session_id}/events", status_code=201)
async def append_event(session_id: str, event: SessionEvent) -> InterviewSession:
    try:
        return sessions.append_event(session_id, event)
    except SessionNotFoundError as error:
        raise HTTPException(status_code=404, detail="Session not found") from error
    except SessionEndedError as error:
        raise HTTPException(
            status_code=409, detail="Session already ended"
        ) from error


@app.post("/sessions/{session_id}/end")
async def end_session(session_id: str) -> InterviewSession:
    try:
        return sessions.end(session_id)
    except SessionNotFoundError as error:
        raise HTTPException(status_code=404, detail="Session not found") from error
