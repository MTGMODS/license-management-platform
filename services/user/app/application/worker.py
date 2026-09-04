import asyncio

from app.shared.database import AsyncSessionLocal
from app.infrastructure.repository import OAuthHandoffRepository, RefreshSessionRepository

AUTH_CLEANUP_INTERVAL_SECONDS = 15 * 60


async def cleanup_auth_artifacts_once() -> tuple[int, int]:
    async with AsyncSessionLocal() as db:
        handoffs = await OAuthHandoffRepository(db).purge_expired()
        sessions = await RefreshSessionRepository(db).purge_expired()
        return handoffs, sessions


async def cleanup_auth_artifacts_task():
    while True:
        try:
            handoffs, sessions = await cleanup_auth_artifacts_once()
            if handoffs or sessions:
                print(f"[Auth Cleanup] removed {handoffs} handoffs, {sessions} refresh sessions")
        except Exception as exc:
            print(f"[Auth Cleanup] {exc}")

        await asyncio.sleep(AUTH_CLEANUP_INTERVAL_SECONDS)
