from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_POSTGRES_URL: str
    API_VERSION: str
    APP_VERSION: str
    DEBUG_MODE: bool

    # --- JWT ---
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # --- Discord OAuth2 ---
    DISCORD_CLIENT_ID: str
    DISCORD_CLIENT_SECRET: str
    DISCORD_REDIRECT_URI: str

    # --- Telegram OAuth2 ---
    TELEGRAM_CLIENT_ID: str
    TELEGRAM_CLIENT_SECRET: str
    TELEGRAM_CALLBACK_URL: str

    # --- Telegram Mini App ---
    TELEGRAM_BOT_TOKEN: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()