from sqlalchemy import Column, Integer, String, DateTime, select, func, distinct, case, text, and_, cast, Date, desc
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

            func.count(distinct(case((LaunchModel.device == 'MOBILE', LaunchModel.hwid)))).label("mob_all"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d30), LaunchModel.hwid)))).label("mob_30d"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1), LaunchModel.hwid)))).label("mob_24h"),
            func.count(distinct(case((and_(LaunchModel.device == 'MOBILE', LaunchModel.launched_at >= d1h), LaunchModel.hwid)))).label("mob_1h"),
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
                "pc": {"all_time": res.pc_all, "30d": res.pc_30d, "24h": res.pc_24h, "1h": res.pc_1h},
                "mobile": {"all_time": res.mob_all, "30d": res.mob_30d, "24h": res.mob_24h, "1h": res.mob_1h}
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
                func.count(LaunchModel.id).label("l_all")
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
                "launches": row.l_all
            }
            for row in res.all()
        ]

    async def _get_factions(self, g_u_all):
        stmt = (
            select(
                func.coalesce(LaunchModel.mode, 'none').label("m_name"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))).label("vip_all"),
                func.count(LaunchModel.id).label("l_all")
            )
            .where(LaunchModel.mode.notin_(['none', 'unknown']))
            .group_by("m_name")
            .order_by(desc("u_all"))
        )
        res = await self.db.execute(stmt)
        factions_data = {}
        for row in res.all():
            total_u = row.u_all
            factions_data[row.m_name] = {
                "total_users": total_u,
                "user_share": round((total_u / g_u_all) * 100, 1) if g_u_all > 0 else 0,
                "launches": row.l_all,
                "launches_per_user": round(row.l_all / total_u, 2) if total_u > 0 else 0,
                "vip_users": row.vip_all,
                "vip_percent": round((row.vip_all / total_u) * 100, 1) if total_u > 0 else 0
            }
        return factions_data

    async def _get_versions(self, g_u_all):
        stmt = (
            select(
                LaunchModel.version,
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(LaunchModel.id).label("l_all")
            )
            .group_by(LaunchModel.version)
            .order_by(desc("u_all"))
        )
        res = await self.db.execute(stmt)
        return [
            {
                "version": row.version,
                "users": row.u_all,
                "user_share": round((row.u_all / g_u_all) * 100, 1) if g_u_all > 0 else 0,
                "launches": row.l_all,
                "launches_per_user": round(row.l_all / row.u_all, 2) if row.u_all > 0 else 0
            }
            for row in res.all()
        ]

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

        factions = await self._get_factions(g_u_all)
        servers = await self._get_servers(d30, d1, d1h, g_u_all)
        countries = await self._get_countries(d30, d1, d1h, g_u_all)
        versions = await self._get_versions(g_u_all)
        
        timeline_daily = await self._get_timeline_daily()
        timeline_hourly = await self._get_timeline_hourly(d1)
        
        activity_hourly = await self._get_activity_hourly()
        activity_weekday = await self._get_activity_weekday()

        return {
            "updated_at": now.isoformat(),
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
                "versions": versions
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
    
    # ---- Explorer Query Builder ----

    async def build_explorer_query(self, metrics: list[str], group_by: str, period: str, filters: dict, sort: str, limit: int, offset: int):
        now = datetime.now(timezone.utc)
        
        METRICS_MAP = {
            "users": func.count(distinct(LaunchModel.hwid)),
            "launches": func.count(LaunchModel.id),
            "vip_users": func.count(distinct(case((LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))),
            "free_users": func.count(distinct(case((~LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))),
            "vip_percent": func.coalesce(func.round((func.count(distinct(case((LaunchModel.version.ilike('%VIP%'), LaunchModel.hwid)))) * 100.0) / func.nullif(func.count(distinct(LaunchModel.hwid)), 0), 1), 0),
            "launches_per_user": func.coalesce(func.round(func.count(LaunchModel.id) * 1.0 / func.nullif(func.count(distinct(LaunchModel.hwid)), 0), 2), 0)
        }

        GROUPS_MAP = {
            "server": LaunchModel.server,
            "country": func.coalesce(LaunchModel.country, 'UNKNOWN'),
            "mode": func.coalesce(LaunchModel.mode, 'none'),
            "version": LaunchModel.version,
            "device": LaunchModel.device,
            "date": func.date(LaunchModel.launched_at),
            "hour": func.extract('hour', LaunchModel.launched_at),
            "weekday": func.extract('dow', LaunchModel.launched_at)
        }

        FILTERS_MAP = {
            "server": lambda val: LaunchModel.server == val,
            "country": lambda val: LaunchModel.country == val,
            "mode": lambda val: LaunchModel.mode == val,
            "device": lambda val: LaunchModel.device == val,
            "version": lambda val: LaunchModel.version == val,
            "vip": lambda val: LaunchModel.version.ilike('%VIP%') if val else ~LaunchModel.version.ilike('%VIP%')
        }

        sort_key = None
        descending = False
        if sort:
            descending = sort.startswith("-")
            sort_key = sort.lstrip("-")
            if sort_key in METRICS_MAP and sort_key not in metrics:
                metrics.append(sort_key)

        select_cols = []
        
        if group_by and group_by in GROUPS_MAP:
            select_cols.append(GROUPS_MAP[group_by].label(group_by))
            
        valid_metrics_added = False
        for m in metrics:
            if m in METRICS_MAP:
                select_cols.append(METRICS_MAP[m].label(m))
                valid_metrics_added = True
                
        if not valid_metrics_added:
            select_cols.append(METRICS_MAP["users"].label("users"))

        stmt = select(*select_cols)

        if period == "30d":
            stmt = stmt.where(LaunchModel.launched_at >= now - timedelta(days=30))
        elif period == "24h":
            stmt = stmt.where(LaunchModel.launched_at >= now - timedelta(hours=24))
        elif period == "1h":
            stmt = stmt.where(LaunchModel.launched_at >= now - timedelta(hours=1))

        for f_key, f_val in filters.items():
            if f_key in FILTERS_MAP and f_val is not None:
                stmt = stmt.where(FILTERS_MAP[f_key](f_val))

        if group_by and group_by in GROUPS_MAP:
            stmt = stmt.group_by(GROUPS_MAP[group_by])

        if sort_key:
            allowed_sort_keys = list(METRICS_MAP.keys())
            if group_by and group_by in GROUPS_MAP:
                allowed_sort_keys.append(group_by)

            if sort_key in allowed_sort_keys:
                if descending:
                    stmt = stmt.order_by(text(f"{sort_key} DESC"))
                else:
                    stmt = stmt.order_by(text(f"{sort_key} ASC"))

        stmt = stmt.limit(limit).offset(offset)

        res = await self.db.execute(stmt)
        return [dict(row._mapping) for row in res.all()]