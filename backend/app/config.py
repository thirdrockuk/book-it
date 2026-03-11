from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://bookit:bookit@localhost:5432/bookit"

    # JWT
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"

    # Email (Resend)
    resend_api_key: Optional[str] = None
    email_from_address: str = "bookit@yourdomain.com"
    email_from_name: str = "Bookit"

    # App
    app_name: str = "Bookit"
    app_url: str = "http://localhost:5173"
    environment: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
