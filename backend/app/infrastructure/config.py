from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    backend_cors_origins: str = Field(default="http://localhost:3000", validation_alias="BACKEND_CORS_ORIGINS")
    database_url: str = "mysql+pymysql://kakeibo:kakeibo@localhost:3306/kakeibo"
    jwt_secret: str = Field(default="change-me-in-env", validation_alias="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = Field(default=15, validation_alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_days: int = Field(default=5, validation_alias="JWT_REFRESH_TOKEN_EXPIRE_DAYS")
    access_cookie_name: str = "kakeibo_access"
    refresh_cookie_name: str = "kakeibo_refresh"
    csrf_header_name: str = "X-CSRF-Token"
    csrf_token_minutes: int = Field(default=30, validation_alias="CSRF_TOKEN_EXPIRE_MINUTES")
    cookie_secure: bool = Field(default=True, validation_alias="COOKIE_SECURE")
    cookie_samesite: str = "lax"
    admin_setup_token: str | None = Field(default=None, validation_alias="ADMIN_SETUP_TOKEN")
    upload_storage_root: str = Field(default="storage/uploads", validation_alias="UPLOAD_STORAGE_ROOT")
    max_upload_size_mb: int = Field(default=10, validation_alias="MAX_UPLOAD_SIZE_MB")

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
