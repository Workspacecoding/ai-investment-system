import sys
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == email).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_me_with_token_and_without_token():
    email = f"test_user_{uuid4().hex}@example.com"
    password = "12345678"
    name = "Test User"
    cleanup_user(email)

    try:
        register_response = client.post(
            "/register",
            json={
                "email": email,
                "password": password,
                "name": name,
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

        access_token = login_response.json()["access_token"]
        response = client.get(
            "/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        data = response.json()

        assert response.status_code == 200
        assert "id" in data
        assert data["email"] == email
        assert data["name"] == name
        assert "password_hash" not in data

        missing_token_response = client.get("/me")

        assert missing_token_response.status_code in (401, 403)
    finally:
        cleanup_user(email)
