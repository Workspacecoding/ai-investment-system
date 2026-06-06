from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.settings import UserSettingResponse, UserSettingUpdate
from app.services.settings import get_or_create_user_setting, update_user_setting


router = APIRouter()


@router.get("/settings", response_model=UserSettingResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_or_create_user_setting(db, current_user.id)


@router.put("/settings", response_model=UserSettingResponse)
def put_settings(
    setting_update: UserSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_user_setting(db, current_user.id, setting_update)
