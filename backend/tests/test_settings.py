import sys
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
            "name": "Settings Test User",
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


def test_settings_requires_auth_and_can_update():
    email = f"test_user_{uuid4().hex}@example.com"
    cleanup_user(email)

    try:
        missing_token_response = client.get("/settings")
        assert missing_token_response.status_code in (401, 403)

        headers = create_auth_headers(email)

        response = client.get("/settings", headers=headers)
        data = response.json()

        assert response.status_code == 200
        assert data["strategy_enabled"] is True
        assert data["allow_crypto"] is False
        assert data["allow_penny_stock"] is False
        assert data["risk_level"] == "balanced"
        assert data["max_drawdown"] == 0.2

        update_payload = {
            "strategy_enabled": False,
            "allow_crypto": True,
            "allow_penny_stock": True,
            "risk_level": "aggressive",
            "max_drawdown": 0.35,
        }
        update_response = client.put("/settings", json=update_payload, headers=headers)
        updated_data = update_response.json()

        assert update_response.status_code == 200
        for key, value in update_payload.items():
            assert updated_data[key] == value

        get_response = client.get("/settings", headers=headers)
        get_data = get_response.json()

        assert get_response.status_code == 200
        for key, value in update_payload.items():
            assert get_data[key] == value
    finally:
        cleanup_user(email)
