from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi.encoders import ENCODERS_BY_TYPE
from pydantic import PlainSerializer

UTC_DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def format_utc(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return to_utc(dt).strftime(UTC_DATETIME_FORMAT)

def _encode_datetime(dt: datetime) -> str:
    return format_utc(dt)

ENCODERS_BY_TYPE[datetime] = _encode_datetime

UtcDateTime = Annotated[datetime, PlainSerializer(format_utc, return_type=str, when_used="json")]
