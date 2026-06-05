from sqlalchemy import Column, Integer, String, DateTime, select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func as sql_func
from datetime import datetime, timezone
from app.shared.database import Base

class LaunchModel(Base):
    __tablename__ = "launches"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, nullable=False)
    device = Column(String, nullable=False)
    server = Column(Integer, index=True, nullable=True)
    country = Column(String, nullable=True)
    launched_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class LaunchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(self, version: str, hwid: str, device: str, server_id: int, country: str):
        new_launch = LaunchModel(version=version, hwid=hwid, device=device, server_id=server_id, country=country)
        self.db.add(new_launch)
        await self.db.commit()
        await self.db.refresh(new_launch)
        return new_launch
    
    async def get_public_stats(self):
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        dau_stmt = select(func.count(distinct(LaunchModel.hwid))).where(LaunchModel.launched_at >= today)
        dau = (await self.db.execute(dau_stmt)).scalar() or 0

        pc_stmt = select(func.count(LaunchModel.id)).where(LaunchModel.device == "PC")
        mobile_stmt = select(func.count(LaunchModel.id)).where(LaunchModel.device == "MOBILE")
        
        pc_count = (await self.db.execute(pc_stmt)).scalar() or 0
        mobile_count = (await self.db.execute(mobile_stmt)).scalar() or 0

        return {
            "dau": dau,
            "devices": {"PC": pc_count, "MOBILE": mobile_count}
        }