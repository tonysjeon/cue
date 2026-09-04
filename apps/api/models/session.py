from typing import Annotated, Literal

from pydantic import BaseModel, Field

ExecutionResult = Literal[
    "PASSED",
    "WRONG_ANSWER",
    "RUNTIME_ERROR",
    "TIME_LIMIT",
    "UNKNOWN",
]


class ProblemContext(BaseModel):
    platform: Literal["neetcode"]
    title: str
    description: str
    constraints: list[str]
    examples: list[str]
    language: str
    code: str


class SpeechEvent(BaseModel):
    type: Literal["speech"]
    timestamp: int
    transcript: str


class CodeEvent(BaseModel):
    type: Literal["code"]
    timestamp: int
    code: str


class RunEvent(BaseModel):
    type: Literal["run"]
    timestamp: int
    result: ExecutionResult


class SubmissionEvent(BaseModel):
    type: Literal["submission"]
    timestamp: int
    result: ExecutionResult


class InterviewerEvent(BaseModel):
    type: Literal["interviewer"]
    timestamp: int
    message: str


SessionEvent = Annotated[
    SpeechEvent | CodeEvent | RunEvent | SubmissionEvent | InterviewerEvent,
    Field(discriminator="type"),
]


class InterviewSession(BaseModel):
    id: str
    started_at: int
    problem: ProblemContext
    events: list[SessionEvent]
    ended_at: int | None = None


class CreateSessionResponse(BaseModel):
    sessionId: str
