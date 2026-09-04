from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

PROBLEM = {
    "platform": "neetcode",
    "title": "Contains Duplicate",
    "description": "Return true if any value appears more than once.",
    "constraints": ["0 <= nums.length <= 10^5"],
    "examples": ["Input: nums = [1,2,3,3]"],
    "language": "Python",
    "code": "class Solution:\n    def hasDuplicate(self, nums):\n        pass\n",
}


def test_create_session() -> None:
    response = client.post("/sessions", json=PROBLEM)

    assert response.status_code == 201
    payload = response.json()
    assert "sessionId" in payload
    assert payload["sessionId"]


def test_append_code_and_execution_events() -> None:
    session_id = client.post("/sessions", json=PROBLEM).json()["sessionId"]

    code_response = client.post(
        f"/sessions/{session_id}/events",
        json={
            "type": "code",
            "timestamp": 1_000,
            "code": (
                "class Solution:\n"
                "    def hasDuplicate(self, nums):\n"
                "        return len(set(nums)) != len(nums)\n"
            ),
        },
    )
    run_response = client.post(
        f"/sessions/{session_id}/events",
        json={"type": "run", "timestamp": 2_000, "result": "WRONG_ANSWER"},
    )
    submit_response = client.post(
        f"/sessions/{session_id}/events",
        json={"type": "submission", "timestamp": 3_000, "result": "PASSED"},
    )

    assert code_response.status_code == 201
    assert run_response.status_code == 201
    assert submit_response.status_code == 201

    session = client.get(f"/sessions/{session_id}").json()
    assert session["id"] == session_id
    assert session["problem"]["title"] == "Contains Duplicate"
    assert [event["type"] for event in session["events"]] == [
        "code",
        "run",
        "submission",
    ]
    assert session["events"][1]["result"] == "WRONG_ANSWER"
    assert session["events"][2]["result"] == "PASSED"


def test_missing_session_returns_404() -> None:
    response = client.post(
        "/sessions/missing/events",
        json={"type": "run", "timestamp": 1, "result": "PASSED"},
    )

    assert response.status_code == 404


def test_rejects_unknown_execution_result() -> None:
    session_id = client.post("/sessions", json=PROBLEM).json()["sessionId"]
    response = client.post(
        f"/sessions/{session_id}/events",
        json={"type": "run", "timestamp": 1, "result": "FAILED"},
    )

    assert response.status_code == 422


def test_end_session_freezes_timeline() -> None:
    session_id = client.post("/sessions", json=PROBLEM).json()["sessionId"]
    ended = client.post(f"/sessions/{session_id}/end")

    assert ended.status_code == 200
    assert ended.json()["ended_at"] is not None

    rejected = client.post(
        f"/sessions/{session_id}/events",
        json={"type": "run", "timestamp": 1, "result": "PASSED"},
    )
    assert rejected.status_code == 409

    again = client.post(f"/sessions/{session_id}/end")
    assert again.status_code == 200
    assert again.json()["ended_at"] == ended.json()["ended_at"]
