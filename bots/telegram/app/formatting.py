from datetime import datetime, timezone


def format_datetime(value: str | None) -> str:
    if not value or value == "FOREVER":
        return value or "—"
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        unix = int(dt.timestamp())
        fallback = dt.astimezone(timezone.utc).strftime("%d.%m.%Y %H:%M")
        # Telegram allows date_time only up to now + 1098 days
        max_unix = int(datetime.now(timezone.utc).timestamp()) + 1098 * 86400
        if unix < 0 or unix > max_unix:
            return fallback
        return f'<tg-time unix="{unix}" format="dt">{fallback}</tg-time>'
    except (TypeError, ValueError):
        return value


def format_vip_access(expires_at: str | None) -> str:
    if not expires_at or expires_at == "FOREVER":
        return "FOREVER"
    return f"до {format_datetime(expires_at)}"


def format_price(value) -> str:
    try:
        return str(int(float(value)))
    except (TypeError, ValueError):
        return str(value)
