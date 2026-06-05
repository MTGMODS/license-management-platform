from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.repository import LaunchRepository

class UsageService:
    _cached_stats = None
    _cache_expires_at = None

    def __init__(self, db: AsyncSession):
        self.repo = LaunchRepository(db)

    async def log_launch(self, version: str, hwid: str, server: int, device: str, country: str):
        await self.repo.save(version=version, hwid=hwid, device=device, server=server, country=country)
        return {"status": "success", "message": "Launch logged"}

    async def get_website_stats(self):
        now = datetime.now(timezone.utc)

        if UsageService._cached_stats and UsageService._cache_expires_at:
            if now < UsageService._cache_expires_at:
                return UsageService._cached_stats

        stats = await self.repo.get_heavy_public_stats()

        UsageService._cached_stats = stats
        UsageService._cache_expires_at = now + timedelta(minutes=5)

        return stats