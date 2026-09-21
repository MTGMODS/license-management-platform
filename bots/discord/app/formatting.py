import discord
from datetime import datetime


def create_embed(text: str) -> discord.Embed:
    return discord.Embed(description=text, color=0x009EFF)


def format_discord_datetime(value: str | None) -> str:
    if not value:
        return "—"
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return f"<t:{int(dt.timestamp())}:f>"
    except (TypeError, ValueError):
        return value


def format_vip_access(expires_at: str | None) -> str:
    if not expires_at or expires_at == "FOREVER":
        return "FOREVER"
    return f"до {format_discord_datetime(expires_at)}"
