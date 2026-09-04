from time import time
from uuid import uuid4

from models.session import InterviewSession, ProblemContext, SessionEvent


class SessionNotFoundError(Exception):
    def __init__(self, session_id: str) -> None:
        super().__init__(session_id)
        self.session_id = session_id


class SessionEndedError(Exception):
    def __init__(self, session_id: str) -> None:
        super().__init__(session_id)
        self.session_id = session_id


class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, InterviewSession] = {}

    def create(self, problem: ProblemContext) -> InterviewSession:
        session = InterviewSession(
            id=uuid4().hex,
            started_at=int(time() * 1000),
            problem=problem,
            events=[],
        )
        self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> InterviewSession:
        session = self._sessions.get(session_id)
        if session is None:
            raise SessionNotFoundError(session_id)
        return session

    def append_event(self, session_id: str, event: SessionEvent) -> InterviewSession:
        session = self.get(session_id)
        if session.ended_at is not None:
            raise SessionEndedError(session_id)
        session.events.append(event)
        return session

    def end(self, session_id: str) -> InterviewSession:
        session = self.get(session_id)
        if session.ended_at is None:
            session.ended_at = int(time() * 1000)
        return session
