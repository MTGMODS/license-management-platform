from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DOWNLOAD_BASE_URL: str = "http://localhost:8005/api/v1/files/downloads/vip"
    RABBITMQ_URL: str
    API_VERSION: str
    APP_VERSION: str
    DEBUG_MODE: bool

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()