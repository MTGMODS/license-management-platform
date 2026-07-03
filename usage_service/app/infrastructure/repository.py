from sqlalchemy import Column, Integer, String, DateTime, select, func, distinct, case, text, and_
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
    mode = Column(String, index=True, nullable=True)
    launched_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class LaunchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(self, version: str, hwid: str, device: str, server: int, country: str, mode: str):
        new_launch = LaunchModel(
            version=version, 
            hwid=hwid, 
            device=device, 
            server=server, 
            country=country,
            mode=mode
        )
        self.db.add(new_launch)
        await self.db.commit()
        await self.db.refresh(new_launch)
        return new_launch
    
    async def get_heavy_public_stats(self):
        now = datetime.now(timezone.utc)
        d30 = now - timedelta(days=30)
        d1 = now - timedelta(hours=24)
        d1h = now - timedelta(hours=1)

        global_stmt = select(
            # Total Users
            func.count(distinct(LaunchModel.hwid)).label("u_all"),
            func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
            func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
            func.count(distinct(case((LaunchModel.launched_at >= d1h, LaunchModel.hwid)))).label("u_1h"),
            
            # VIP Users
            func.count(distinct(case((LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))).label("vip_all"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("vip_30d"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("vip_24h"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("vip_1h"), 

            # FREE Users
            func.count(distinct(case((~LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))).label("free_all"),
            func.count(distinct(case((and_(~LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("free_30d"),
            func.count(distinct(case((and_(~LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("free_24h"),
            func.count(distinct(case((and_(~LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("free_1h"),

            # Total Launches
            func.count(LaunchModel.id).label("l_all"),
            func.count(case((LaunchModel.launched_at >= d30, LaunchModel.id))).label("l_30d"),
            func.count(case((LaunchModel.launched_at >= d1, LaunchModel.id))).label("l_24h"),
            func.count(case((LaunchModel.launched_at >= d1h, LaunchModel.id))).label("l_1h"),

            # Devices (PC)
            func.count(distinct(case((LaunchModel.device == 'PC', LaunchModel.hwid)))).label("pc_all"),
            func.count(distinct(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("pc_30d"),
            func.count(distinct(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("pc_24h"),
            func.count(distinct(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("pc_1h"), # <--- 1h

            # Devices (MOBILE)
            func.count(distinct(case((LaunchModel.device == 'MOBILE', LaunchModel.hwid)))).label("mob_all"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("mob_30d"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("mob_24h"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("mob_1h"),
        )
        global_res = (await self.db.execute(global_stmt)).first()


        server_stmt = (
            select(
                LaunchModel.server,
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
                func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
                func.count(distinct(case((LaunchModel.launched_at >= d1h, LaunchModel.hwid)))).label("u_1h"),
                func.count(LaunchModel.id).label("l_all"),
                func.count(case((LaunchModel.launched_at >= d30, LaunchModel.id))).label("l_30d"),
                func.count(case((LaunchModel.launched_at >= d1, LaunchModel.id))).label("l_24h"),
                func.count(case((LaunchModel.launched_at >= d1h, LaunchModel.id))).label("l_1h")
            )
            .where(LaunchModel.server != 200)
            .group_by(LaunchModel.server)
            .order_by(LaunchModel.server)
        )
        server_res = await self.db.execute(server_stmt)
        servers_data = [
            {
                "server": row.server,
                "users": {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h},
                "launches": {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h, "1h": row.l_1h}
            }
            for row in server_res.all()
        ]

        country_stmt = (
            select(
                func.coalesce(LaunchModel.country, 'UNKNOWN').label("c_code"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
                func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
                func.count(distinct(case((LaunchModel.launched_at >= d1h, LaunchModel.hwid)))).label("u_1h")
            )
            .group_by("c_code")
            .order_by(text("u_all DESC"))
        )
        country_res = await self.db.execute(country_stmt)
        countries_data = [
            {
                "code": row.c_code,
                "users": {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h}
            }
            for row in country_res.all()
        ]

        mode_stmt = (
            select(
                func.coalesce(LaunchModel.mode, 'none').label("m_name"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))).label("vip_all")
            )
            .where(LaunchModel.mode.notin_(['none', 'unknown'])) 
            .group_by("m_name")
            .order_by(text("u_all DESC"))
        )
        mode_res = await self.db.execute(mode_stmt)
        factions_data = {}
        for row in mode_res.all():
            total_u = row.u_all
            vip_pct = round((row.vip_all / total_u) * 100) if total_u > 0 else 0
            factions_data[row.m_name] = {
                "total_users": total_u,
                "vip_users": row.vip_all,
                "vip_percent": f"{vip_pct}%"
            }

        vip_conversion = round((global_res.vip_all / global_res.u_all) * 100, 1) if global_res.u_all > 0 else 0
        total_devices = global_res.pc_all + global_res.mob_all
        pc_ratio = round((global_res.pc_all / total_devices) * 100) if total_devices > 0 else 0
        mob_ratio = 100 - pc_ratio

        return {
            "updated_at": now.isoformat(),
            "metrics": {
                "vip_conversion_rate": f"{vip_conversion}%",
                "pc_mobile_ratio": f"{pc_ratio}% / {mob_ratio}%"
            },
            "users": {
                "total": {"all_time": global_res.u_all, "30d": global_res.u_30d, "24h": global_res.u_24h, "1h": global_res.u_1h},
                "vip": {"all_time": global_res.vip_all, "30d": global_res.vip_30d, "24h": global_res.vip_24h, "1h": global_res.vip_1h},
                "free": {"all_time": global_res.free_all, "30d": global_res.free_30d, "24h": global_res.free_24h, "1h": global_res.free_1h}
            },
            "launches": {
                "all_time": global_res.l_all,
                "30d": global_res.l_30d,
                "24h": global_res.l_24h,
                "1h": global_res.l_1h
            },
            "devices": {
                "pc": {"all_time": global_res.pc_all, "30d": global_res.pc_30d, "24h": global_res.pc_24h, "1h": global_res.pc_1h},
                "mobile": {"all_time": global_res.mob_all, "30d": global_res.mob_30d, "24h": global_res.mob_24h, "1h": global_res.mob_1h}
            },
            "factions": factions_data,
            "servers": servers_data,
            "countries": countries_data
        }