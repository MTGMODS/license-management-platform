from sqlalchemy import Column, Integer, String, DateTime, select, func, distinct, case, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func as sql_func
from datetime import datetime, timedelta, timezone
from app.shared.database import Base
from app.shared.datetime_utils import format_utc

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


    # ---- Analytics Methods ----

    async def _get_global(self, d30, d1, d1h):
        stmt = select(
            func.count(distinct(LaunchModel.hwid)).label("u_all"),
            func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
            func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
            func.count(distinct(case((LaunchModel.launched_at >= d1h, LaunchModel.hwid)))).label("u_1h"),
            
            func.count(distinct(case((LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))).label("vip_all"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("vip_30d"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("vip_24h"),
            func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("vip_1h"),

            func.count(distinct(case((~LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))).label("free_all"),
            func.count(distinct(case((and_(~LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("free_30d"),
            func.count(distinct(case((and_(~LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("free_24h"),
            func.count(distinct(case((and_(~LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("free_1h"),

            func.count(LaunchModel.id).label("l_all"),
            func.count(case((LaunchModel.launched_at >= d30, LaunchModel.id))).label("l_30d"),
            func.count(case((LaunchModel.launched_at >= d1, LaunchModel.id))).label("l_24h"),
            func.count(case((LaunchModel.launched_at >= d1h, LaunchModel.id))).label("l_1h"),

            func.count(distinct(case((LaunchModel.device == 'PC', LaunchModel.hwid)))).label("pc_all"),
            func.count(distinct(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("pc_30d"),
            func.count(distinct(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("pc_24h"),
            func.count(distinct(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("pc_1h"),

            func.count(case((LaunchModel.device == 'PC', LaunchModel.id))).label("pc_l_all"),
            func.count(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d30), LaunchModel.id))).label("pc_l_30d"),
            func.count(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d1), LaunchModel.id))).label("pc_l_24h"),
            func.count(case((and_(LaunchModel.device == 'PC', LaunchModel.launched_at >= d1h), LaunchModel.id))).label("pc_l_1h"),

            func.count(distinct(case((LaunchModel.device == 'MOBILE', LaunchModel.hwid)))).label("mob_all"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("mob_30d"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("mob_24h"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("mob_1h"),

            func.count(case((LaunchModel.device == 'MOBILE', LaunchModel.id))).label("mob_l_all"),
            func.count(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d30), LaunchModel.id))).label("mob_l_30d"),
            func.count(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1), LaunchModel.id))).label("mob_l_24h"),
            func.count(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1h), LaunchModel.id))).label("mob_l_1h"),
        )
        res = (await self.db.execute(stmt)).first()
        
        g_u_all = res.u_all if res and res.u_all > 0 else 0
        g_l_all = res.l_all if res and res.l_all > 0 else 0

        vip_conversion = round((res.vip_all / g_u_all) * 100, 1) if g_u_all > 0 else 0
        total_devices = res.pc_all + res.mob_all
        pc_ratio = round((res.pc_all / total_devices) * 100) if total_devices > 0 else 0
        mob_ratio = 100 - pc_ratio

        global_data = {
            "metrics": {
                "vip_conversion": vip_conversion,
                "pc_ratio": pc_ratio,
                "mobile_ratio": mob_ratio,
                "global_launches_per_user": round(g_l_all / g_u_all, 2) if g_u_all > 0 else 0
            },
            "users": {
                "total": {"all_time": res.u_all, "30d": res.u_30d, "24h": res.u_24h, "1h": res.u_1h},
                "vip": {"all_time": res.vip_all, "30d": res.vip_30d, "24h": res.vip_24h, "1h": res.vip_1h},
                "free": {"all_time": res.free_all, "30d": res.free_30d, "24h": res.free_24h, "1h": res.free_1h}
            },
            "launches": {
                "all_time": res.l_all,
                "30d": res.l_30d,
                "24h": res.l_24h,
                "1h": res.l_1h
            },
            "devices": {
                "pc": {
                    "users": {"all_time": res.pc_all, "30d": res.pc_30d, "24h": res.pc_24h, "1h": res.pc_1h},
                    "launches": {"all_time": res.pc_l_all, "30d": res.pc_l_30d, "24h": res.pc_l_24h, "1h": res.pc_l_1h}
                },
                "mobile": {
                    "users": {"all_time": res.mob_all, "30d": res.mob_30d, "24h": res.mob_24h, "1h": res.mob_1h},
                    "launches": {"all_time": res.mob_l_all, "30d": res.mob_l_30d, "24h": res.mob_l_24h, "1h": res.mob_l_1h}
                }
            }
        }
        return global_data, g_u_all

    async def _get_servers(self, d30, d1, d1h, g_u_all):
        stmt = (
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
            .order_by(LaunchModel.server.asc())
        )
        res = await self.db.execute(stmt)
        return [
            {
                "server": row.server,
                "user_share": round((row.u_all / g_u_all) * 100, 1) if g_u_all > 0 else 0,
                "launches_per_user": round(row.l_all / row.u_all, 2) if row.u_all > 0 else 0,
                "users": {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h},
                "launches": {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h, "1h": row.l_1h}
            }
            for row in res.all()
        ]

    async def _get_countries(self, d30, d1, d1h, g_u_all):
        stmt = (
            select(
                func.coalesce(LaunchModel.country, 'UNKNOWN').label("c_code"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
                func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
                func.count(distinct(case((LaunchModel.launched_at >= d1h, LaunchModel.hwid)))).label("u_1h"),
                func.count(LaunchModel.id).label("l_all"),
                func.count(case((LaunchModel.launched_at >= d30, LaunchModel.id))).label("l_30d"),
                func.count(case((LaunchModel.launched_at >= d1, LaunchModel.id))).label("l_24h"),
                func.count(case((LaunchModel.launched_at >= d1h, LaunchModel.id))).label("l_1h")
            )
            .group_by("c_code")
            .order_by(desc("u_all"))
        )
        res = await self.db.execute(stmt)
        return [
            {
                "code": row.c_code,
                "user_share": round((row.u_all / g_u_all) * 100, 1) if g_u_all > 0 else 0,
                "launches_per_user": round(row.l_all / row.u_all, 2) if row.u_all > 0 else 0,
                "users": {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h},
                "launches": {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h, "1h": row.l_1h}
            }
            for row in res.all()
        ]

    async def _get_factions(self, d30, d1, d1h, g_u_all):
        stmt = (
            select(
                func.coalesce(LaunchModel.mode, 'none').label("m_name"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
                func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
                func.count(distinct(case((LaunchModel.launched_at >= d1h, LaunchModel.hwid)))).label("u_1h"),
                func.count(distinct(case((LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))).label("vip_all"),
                func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("vip_30d"),
                func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("vip_24h"),
                func.count(distinct(case((and_(LaunchModel.version.ilike('%VIP%'), LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("vip_1h"),
                func.count(LaunchModel.id).label("l_all"),
                func.count(case((LaunchModel.launched_at >= d30, LaunchModel.id))).label("l_30d"),
                func.count(case((LaunchModel.launched_at >= d1, LaunchModel.id))).label("l_24h"),
                func.count(case((LaunchModel.launched_at >= d1h, LaunchModel.id))).label("l_1h")
            )
            .group_by("m_name")
            .order_by(desc("u_all"))
        )
        res = await self.db.execute(stmt)
        return [
            {
                "mode": row.m_name,
                "user_share": round((row.u_all / g_u_all) * 100, 1) if g_u_all > 0 else 0,
                "launches_per_user": round(row.l_all / row.u_all, 2) if row.u_all > 0 else 0,
                "vip_percent": round((row.vip_all / row.u_all) * 100, 1) if row.u_all > 0 else 0,
                "users": {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h},
                "vip_users": {"all_time": row.vip_all, "30d": row.vip_30d, "24h": row.vip_24h, "1h": row.vip_1h},
                "launches": {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h, "1h": row.l_1h}
            }
            for row in res.all()
        ]

    async def _get_versions(self, d30, d1, d1h, g_u_all):
        stmt = (
            select(
                LaunchModel.version,
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.launched_at >= d30, LaunchModel.hwid)))).label("u_30d"),
                func.count(distinct(case((LaunchModel.launched_at >= d1, LaunchModel.hwid)))).label("u_24h"),
                func.count(distinct(case((LaunchModel.launched_at >= d1h, LaunchModel.hwid)))).label("u_1h"),
                func.count(LaunchModel.id).label("l_all"),
                func.count(case((LaunchModel.launched_at >= d30, LaunchModel.id))).label("l_30d"),
                func.count(case((LaunchModel.launched_at >= d1, LaunchModel.id))).label("l_24h"),
                func.count(case((LaunchModel.launched_at >= d1h, LaunchModel.id))).label("l_1h")
            )
            .group_by(LaunchModel.version)
            .order_by(desc("u_all"))
        )
        res = await self.db.execute(stmt)
        return [
            {
                "version": row.version,
                "user_share": round((row.u_all / g_u_all) * 100, 1) if g_u_all > 0 else 0,
                "launches_per_user": round(row.l_all / row.u_all, 2) if row.u_all > 0 else 0,
                "users": {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h},
                "launches": {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h, "1h": row.l_1h}
            }
            for row in res.all()
        ]

    async def _get_products(self, d30, d1, d1h, g_u_all):
        families = [
            ("arizona_pc", LaunchModel.server.between(1, 32)),
            ("arizona_mobile", LaunchModel.server.between(101, 103)),
            ("rodina_pc", LaunchModel.server.between(301, 307)),
            ("rodina_mobile", LaunchModel.server.between(401, 402)),
        ]

        select_cols = []
        for name, cond in families:
            select_cols.extend([
                func.count(distinct(case((cond, LaunchModel.hwid)))).label(f"{name}_u_all"),
                func.count(distinct(case((and_(cond, LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label(f"{name}_u_30d"),
                func.count(distinct(case((and_(cond, LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label(f"{name}_u_24h"),
                func.count(distinct(case((and_(cond, LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label(f"{name}_u_1h"),
                func.count(case((cond, LaunchModel.id))).label(f"{name}_l_all"),
                func.count(case((and_(cond, LaunchModel.launched_at >= d30), LaunchModel.id))).label(f"{name}_l_30d"),
                func.count(case((and_(cond, LaunchModel.launched_at >= d1), LaunchModel.id))).label(f"{name}_l_24h"),
                func.count(case((and_(cond, LaunchModel.launched_at >= d1h), LaunchModel.id))).label(f"{name}_l_1h"),
            ])

        res = (await self.db.execute(select(*select_cols))).first()
        products = []
        for name, _ in families:
            u_all = getattr(res, f"{name}_u_all") or 0
            l_all = getattr(res, f"{name}_l_all") or 0
            products.append({
                "product": name,
                "user_share": round((u_all / g_u_all) * 100, 1) if g_u_all > 0 else 0,
                "launches_per_user": round(l_all / u_all, 2) if u_all > 0 else 0,
                "users": {
                    "all_time": u_all,
                    "30d": getattr(res, f"{name}_u_30d") or 0,
                    "24h": getattr(res, f"{name}_u_24h") or 0,
                    "1h": getattr(res, f"{name}_u_1h") or 0,
                },
                "launches": {
                    "all_time": l_all,
                    "30d": getattr(res, f"{name}_l_30d") or 0,
                    "24h": getattr(res, f"{name}_l_24h") or 0,
                    "1h": getattr(res, f"{name}_l_1h") or 0,
                },
            })
        return products

    async def _get_timeline_daily(self):
        stmt = (
            select(
                func.date(LaunchModel.launched_at).label("dt"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(LaunchModel.id).label("l_all")
            )
            .group_by(func.date(LaunchModel.launched_at))
            .order_by(func.date(LaunchModel.launched_at))
        )
        res = await self.db.execute(stmt)
        return [
            {
                "date": str(row.dt) if row.dt else "Unknown",
                "users": row.u_all,
                "launches": row.l_all
            }
            for row in res.all()
        ]

    async def _get_timeline_hourly(self, d1):
        stmt = (
            select(
                func.date(LaunchModel.launched_at).label("dt"),
                func.extract('hour', LaunchModel.launched_at).label("hr"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(LaunchModel.id).label("l_all")
            )
            .where(LaunchModel.launched_at >= d1)
            .group_by(func.date(LaunchModel.launched_at), func.extract('hour', LaunchModel.launched_at))
            .order_by(func.date(LaunchModel.launched_at), func.extract('hour', LaunchModel.launched_at))
        )
        res = await self.db.execute(stmt)
        return [
            {
                "date": str(row.dt) if row.dt else "Unknown",
                "hour": int(row.hr) if row.hr is not None else 0,
                "users": row.u_all,
                "launches": row.l_all
            }
            for row in res.all()
        ]

    async def _get_activity_hourly(self):
        stmt = (
            select(
                func.extract('hour', LaunchModel.launched_at).label("hr"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(LaunchModel.id).label("l_all")
            )
            .group_by(func.extract('hour', LaunchModel.launched_at))
            .order_by(func.extract('hour', LaunchModel.launched_at))
        )
        res = await self.db.execute(stmt)
        return [
            {
                "hour": int(row.hr) if row.hr is not None else 0,
                "users": row.u_all,
                "launches": row.l_all
            }
            for row in res.all()
        ]

    async def _get_activity_weekday(self):
        stmt = (
            select(
                func.extract('dow', LaunchModel.launched_at).label("dow"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(LaunchModel.id).label("l_all")
            )
            .group_by(func.extract('dow', LaunchModel.launched_at))
            .order_by(func.extract('dow', LaunchModel.launched_at))
        )
        res = await self.db.execute(stmt)
        return [
            {
                "weekday": int(row.dow) if row.dow is not None else 0,
                "users": row.u_all,
                "launches": row.l_all
            }
            for row in res.all()
        ]

    async def get_heavy_public_stats(self):
        now = datetime.now(timezone.utc)
        d30 = now - timedelta(days=30)
        d1 = now - timedelta(hours=24)
        d1h = now - timedelta(hours=1)

        global_data, g_u_all = await self._get_global(d30, d1, d1h)

        factions = await self._get_factions(d30, d1, d1h, g_u_all)
        servers = await self._get_servers(d30, d1, d1h, g_u_all)
        countries = await self._get_countries(d30, d1, d1h, g_u_all)
        versions = await self._get_versions(d30, d1, d1h, g_u_all)
        products = await self._get_products(d30, d1, d1h, g_u_all)
        
        timeline_daily = await self._get_timeline_daily()
        timeline_hourly = await self._get_timeline_hourly(d1)
        
        activity_hourly = await self._get_activity_hourly()
        activity_weekday = await self._get_activity_weekday()

        return {
            "updated_at": format_utc(now),
            "overview": {
                "metrics": global_data["metrics"],
                "users": global_data["users"],
                "launches": global_data["launches"],
                "devices": global_data["devices"]
            },
            "distribution": {
                "factions": factions,
                "servers": servers,
                "countries": countries,
                "versions": versions,
                "products": products
            },
            "analytics": {
                "timeline": {
                    "daily": timeline_daily,
                    "hourly": timeline_hourly
                },
                "activity": {
                    "hourly": activity_hourly,
                    "weekday": activity_weekday
                }
            }
        }
