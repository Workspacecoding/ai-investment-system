from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Investment System"
    app_env: str = "development"
    database_url: str = "sqlite:///./ai_investment.db"
    openai_api_key: str = ""
    market_data_provider: str = ""
    broker_provider: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
