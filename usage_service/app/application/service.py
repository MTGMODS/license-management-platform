from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks
from app.infrastructure.repository import LaunchRepository
from app.shared.database import AsyncSessionLocal
import logging

logger = logging.getLogger(__name__)

class UsageService:
    _cached_stats = None
    _cache_expires_at = None
    _is_generating = False

    def __init__(self, db: AsyncSession):
        self.repo = LaunchRepository(db)

    async def log_launch(self, version: str, hwid: str, server: int, device: str, country: str, mode: str):
        await self.repo.save(version=version, hwid=hwid, device=device, server=server, country=country, mode=mode)
        return {"status": "success", "message": "Launch logged"}

    async def get_website_stats(self, background_tasks: BackgroundTasks = None):
        now = datetime.now(timezone.utc)

        if UsageService._cached_stats and UsageService._cache_expires_at and now < UsageService._cache_expires_at:
            return UsageService._cached_stats

        if UsageService._cached_stats is not None:
            if not UsageService._is_generating and background_tasks is not None:
                UsageService._is_generating = True
                background_tasks.add_task(UsageService._generate_background_stats)
            
            return UsageService._cached_stats

        UsageService._is_generating = True
        try:
            stats = await self.repo.get_heavy_public_stats()
            UsageService._cached_stats = stats
            UsageService._cache_expires_at = datetime.now(timezone.utc) + timedelta(minutes=1)
        finally:
            UsageService._is_generating = False

        return UsageService._cached_stats

    @staticmethod
    async def _generate_background_stats():
        try:
            async with AsyncSessionLocal() as db_session:
                repo = LaunchRepository(db_session)
    
                stats = await repo.get_heavy_public_stats()
                
                UsageService._cached_stats = stats
                UsageService._cache_expires_at = datetime.now(timezone.utc) + timedelta(minutes=1)
                logger.info("Background stats generation completed.")
                
        except Exception as e:
            logger.error(f"Error in background stats generation: {e}")
            
        finally:
            UsageService._is_generating = False