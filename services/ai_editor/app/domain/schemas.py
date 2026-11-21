from pydantic import BaseModel, Field, SecretStr


class AdRequest(BaseModel):
    api_key: SecretStr = Field(min_length=1)
    text: str = Field(min_length=1)
    ai_provider: str = "gemini"
    pro_rules: str | None = None


class AdResponse(BaseModel):
    success: bool
    msg: str
