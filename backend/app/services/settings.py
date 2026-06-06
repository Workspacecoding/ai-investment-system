from sqlalchemy.orm import Session

from app.models.user_setting import UserSetting
from app.schemas.settings import UserSettingUpdate


def get_or_create_user_setting(db: Session, user_id: int) -> UserSetting:
    setting = db.query(UserSetting).filter(UserSetting.user_id == user_id).first()
    if setting:
        return setting

    setting = UserSetting(user_id=user_id)
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def update_user_setting(
    db: Session,
    user_id: int,
    setting_update: UserSettingUpdate,
) -> UserSetting:
    setting = get_or_create_user_setting(db, user_id)
    for field, value in setting_update.model_dump(exclude_unset=True).items():
        setattr(setting, field, value)

    db.commit()
    db.refresh(setting)
    return setting
