from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.repository import LaunchRepository

class UsageService:
    def __init__(self, db: AsyncSession):
        self.repo = LaunchRepository(db)

    async def log_launch(self, version: str, hwid: str, server: int, device: str, country: str):
        await self.repo.save(version=version, hwid=hwid, device=device, server=server, country=country)
        return {"status": "success", "message": "Launch logged"}

    async def get_website_stats(self):
        return await self.repo.get_public_stats()