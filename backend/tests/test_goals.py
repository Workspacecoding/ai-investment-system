import sys
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.user_goal import UserGoal  # noqa: E402
from app.models.user_setting import UserSetting  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            db.query(UserGoal).filter(UserGoal.user_id == user.id).delete(
                synchronize_session=False
            )
            db.query(UserSetting).filter(UserSetting.user_id == user.id).delete(
                synchronize_session=False
            )
            db.delete(user)
            db.commit()
    finally:
        db.close()


def create_auth_headers(email: str, password: str = "12345678") -> dict[str, str]:
    register_response = client.post(
        "/register",
        json={
            "email": email,
            "password": password,
            "name": "Goals Test User",
        },
    )
    assert register_response.status_code in (200, 201)

    login_response = client.post(
        "/login",
        json={
            "email": email,
            "password": password,
        },
    )
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_goals_crud_requires_auth_and_validates_payload():
    email = f"test_user_{uuid4().hex}@example.com"
    cleanup_user(email)

    try:
        missing_token_response = client.get("/goals")
        assert missing_token_response.status_code in (401, 403)

        headers = create_auth_headers(email)
        future_date = date.today() + timedelta(days=365)
        goal_payload = {
            "current_capital": 10000,
            "target_capital": 20000,
            "target_date": future_date.isoformat(),
        }

        create_response = client.post("/goals", json=goal_payload, headers=headers)
        created_goal = create_response.json()

        assert create_response.status_code in (200, 201)
        assert "id" in created_goal
        assert created_goal["current_capital"] == goal_payload["current_capital"]
        assert created_goal["target_capital"] == goal_payload["target_capital"]
        assert created_goal["target_date"] == goal_payload["target_date"]

        list_response = client.get("/goals", headers=headers)
        goals = list_response.json()

        assert list_response.status_code == 200
        assert any(goal["id"] == created_goal["id"] for goal in goals)

        update_payload = {
            "current_capital": 12000,
            "target_capital": 25000,
            "target_date": (date.today() + timedelta(days=730)).isoformat(),
        }
        update_response = client.put(
            f"/goals/{created_goal['id']}",
            json=update_payload,
            headers=headers,
        )
        updated_goal = update_response.json()

        assert update_response.status_code == 200
        assert updated_goal["current_capital"] == update_payload["current_capital"]
        assert updated_goal["target_capital"] == update_payload["target_capital"]
        assert updated_goal["target_date"] == update_payload["target_date"]

        past_date_response = client.post(
            "/goals",
            json={
                "current_capital": 10000,
                "target_capital": 20000,
                "target_date": (date.today() - timedelta(days=1)).isoformat(),
            },
            headers=headers,
        )
        assert past_date_response.status_code in (400, 422)

        invalid_capital_response = client.post(
            "/goals",
            json={
                "current_capital": 0,
                "target_capital": -1,
                "target_date": future_date.isoformat(),
            },
            headers=headers,
        )
        assert invalid_capital_response.status_code in (400, 422)

        delete_response = client.delete(f"/goals/{created_goal['id']}", headers=headers)
        assert delete_response.status_code == 204

        final_list_response = client.get("/goals", headers=headers)
        final_goals = final_list_response.json()

        assert final_list_response.status_code == 200
        assert all(goal["id"] != created_goal["id"] for goal in final_goals)
    finally:
        cleanup_user(email)
