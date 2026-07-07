from pydantic import BaseModel

class GenerationPayloadDTO(BaseModel):
    user_id: int
    key: str
    correlation_id: str = "unknown"