from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserGoalCreate(BaseModel):
    current_capital: float = Field(gt=0)
    target_capital: float = Field(gt=0)
    target_date: date

    @field_validator("target_date")
    @classmethod
    def validate_future_target_date(cls, value: date) -> date:
        if value <= date.today():
            raise ValueError("target_date must be a future date")
        return value


class UserGoalUpdate(BaseModel):
    current_capital: float | None = Field(default=None, gt=0)
    target_capital: float | None = Field(default=None, gt=0)
    target_date: date | None = None

    @field_validator("target_date")
    @classmethod
    def validate_future_target_date(cls, value: date | None) -> date | None:
        if value is not None and value <= date.today():
            raise ValueError("target_date must be a future date")
        return value


class UserGoalResponse(BaseModel):
    id: int
    user_id: int
    current_capital: float
    target_capital: float
    target_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
