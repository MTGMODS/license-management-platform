from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_POSTGRES_URL: str
    RABBITMQ_URL: str
    JWT_SECRET: str
    BOT_SECRET_TOKEN: str
    API_VERSION: str
    APP_VERSION: str
    DEBUG_MODE: bool

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()