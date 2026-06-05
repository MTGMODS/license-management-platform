from sqlalchemy import Column, Integer, String, DateTime, select, func, distinct, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func as sql_func
from datetime import datetime, timedelta, timezone
from app.shared.database import Base

class LaunchModel(Base):
    __tablename__ = "launches"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, nullable=False)
    device = Column(String, nullable=False)
    hwid = Column(String, index=True, nullable=False)
    server = Column(Integer, index=True, nullable=True)
    country = Column(String, nullable=True)
    launched_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class LaunchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(self, version: str, hwid: str, device: str, server: int, country: str):
        new_launch = LaunchModel(version=version, hwid=hwid, device=device, server=server, country=country)
        self.db.add(new_launch)
        await self.db.commit()
        await self.db.refresh(new_launch)
        return new_launch
    
    async def get_heavy_public_stats(self):
        now = datetime.now(timezone.utc)
        d30 = now - timedelta(days=30)
        d1 = now - timedelta(hours=24)

        global_stmt = select(
            # Total Users
            func.count(distinct(LaunchModel.hwid)).label("u_all"),
            func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
            func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
            
            # VIP Users
            func.count(distinct(case((LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))).label("vip_all"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("vip_30d"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("vip_24h"),

            # FREE Users
            func.count(distinct(case((LaunchModel.version.ilike('%FREE%'), LaunchModel.hwid)))).label("free_all"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%FREE%'), LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("free_30d"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%FREE%'), LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("free_24h"),

            # Total Launches
            func.count(LaunchModel.id).label("l_all"),
            func.count(case((LaunchModel.launched_at >= d30, LaunchModel.id))).label("l_30d"),
            func.count(case((LaunchModel.launched_at >= d1, LaunchModel.id))).label("l_24h"),

            # Devices (PC) - рахуємо по унікальних користувачах
            func.count(distinct(case((LaunchModel.device == 'PC', LaunchModel.hwid)))).label("pc_all"),
            func.count(distinct(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("pc_30d"),
            func.count(distinct(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("pc_24h"),

            # Devices (MOBILE)
            func.count(distinct(case((LaunchModel.device == 'MOBILE', LaunchModel.hwid)))).label("mob_all"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("mob_30d"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("mob_24h"),
        )
        
        global_res = (await self.db.execute(global_stmt)).first()

        server_stmt = (
            select(
                LaunchModel.server,
                # Users
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
                func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
                # Launches
                func.count(LaunchModel.id).label("l_all"),
                func.count(case((LaunchModel.launched_at >= d30, LaunchModel.id))).label("l_30d"),
                func.count(case((LaunchModel.launched_at >= d1, LaunchModel.id))).label("l_24h")
            )
            .group_by(LaunchModel.server)
            .order_by(LaunchModel.server)
        )
        
        server_res = await self.db.execute(server_stmt)
        
        servers_data = []
        for row in server_res.all():
            servers_data.append({
                "server": row.server,
                "users": {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h},
                "launches": {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h}
            })


        return {
            "updated_at": now.isoformat(),
            "users": {
                "total": {"all_time": global_res.u_all, "30d": global_res.u_30d, "24h": global_res.u_24h},
                "vip": {"all_time": global_res.vip_all, "30d": global_res.vip_30d, "24h": global_res.vip_24h},
                "free": {"all_time": global_res.free_all, "30d": global_res.free_30d, "24h": global_res.free_24h}
            },
            "launches": {
                "all_time": global_res.l_all,
                "30d": global_res.l_30d,
                "24h": global_res.l_24h
            },
            "devices": {
                "pc": {"all_time": global_res.pc_all, "30d": global_res.pc_30d, "24h": global_res.pc_24h},
                "mobile": {"all_time": global_res.mob_all, "30d": global_res.mob_30d, "24h": global_res.mob_24h}
            },
            "servers": servers_data,
            "countries": []
        }