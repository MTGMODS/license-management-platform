from sqlalchemy import BigInteger, Column, Integer, String, DateTime, select, func, distinct, case, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
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
    mode = Column(String, index=True, nullable=True)
    launched_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class LaunchRepository:

    PERIODS = ("all_time", "30d", "24h", "1h")

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _period_metrics(users: dict, launches: dict, g_users: dict, vip_users: dict | None = None) -> dict:
        user_share = {}
        launches_per_user = {}
        vip_percent = {}
        for p in LaunchRepository.PERIODS:
            u = users.get(p) or 0
            l = launches.get(p) or 0
            gu = g_users.get(p) or 0
            user_share[p] = round((u / gu) * 100, 1) if gu > 0 else 0
            launches_per_user[p] = round(l / u, 2) if u > 0 else 0
            if vip_users is not None:
                vip_percent[p] = round(((vip_users.get(p) or 0) / u) * 100, 1) if u > 0 else 0
        result = {"user_share": user_share, "launches_per_user": launches_per_user}
        if vip_users is not None:
            result["vip_percent"] = vip_percent
        return result

    @staticmethod
    def _launches_per_user(users, launches) -> float:
        return round(launches / users, 2) if users else 0

    async def save(self, version: str, hwid: str, device: str, server: int, mode: str):
        new_launch = LaunchModel(
            version=version,
            hwid=hwid,
            device=device,
            server=server,
            mode=mode,
        )
        self.db.add(new_launch)
        await self.db.commit()
        await self.db.refresh(new_launch)
        return new_launch


    # ---- Analytics Methods ----

    async def _get_global(self, d30, d1, d1h):
        periods = (("30d", d30), ("24h", d1), ("1h", d1h))
        is_vip = LaunchModel.version.ilike('%VIP%')
        scopes = (
            ("u", "l", None),
            ("vip", None, is_vip),
            ("pc", "pc_l", LaunchModel.device == 'PC'),
            ("mob", "mob_l", LaunchModel.device == 'MOBILE'),
            ("pc_vip", None, and_(LaunchModel.device == 'PC', is_vip)),
            ("mob_vip", None, and_(LaunchModel.device == 'MOBILE', is_vip)),
        )
        # A user belongs to a rolling period iff their latest matching event does.
        # Group once by HWID instead of sorting 24 different DISTINCT sets.
        # Keep event counts separately: summing unique daily/device users is wrong.
        per_user_columns = []
        for users_prefix, launches_prefix, condition in scopes:
            timestamp = LaunchModel.launched_at if condition is None else case((condition, LaunchModel.launched_at))
            events = func.count() if condition is None else func.count(case((condition, 1)))
            per_user_columns.extend([
                events.label(f"{users_prefix}_events"),
                func.max(timestamp).label(f"{users_prefix}_last"),
            ])
            if launches_prefix:
                for period, since in periods:
                    matches = LaunchModel.launched_at >= since
                    if condition is not None:
                        matches = and_(condition, matches)
                    per_user_columns.append(func.count(case((matches, 1))).label(f"{launches_prefix}_{period}"))

        per_user = select(*per_user_columns).group_by(LaunchModel.hwid).subquery()
        # PostgreSQL SUM(bigint) returns numeric; cast back to preserve integer counters.
        totals = []
        for users_prefix, launches_prefix, _ in scopes:
            events = per_user.c[f"{users_prefix}_events"]
            last = per_user.c[f"{users_prefix}_last"]
            totals.append(func.count(case((events > 0, 1))).label(f"{users_prefix}_all"))
            totals.extend(func.count(case((last >= since, 1))).label(f"{users_prefix}_{period}")
                          for period, since in periods)
            if launches_prefix:
                totals.append(func.coalesce(func.sum(events), 0).cast(BigInteger).label(f"{launches_prefix}_all"))
                totals.extend(func.coalesce(func.sum(per_user.c[f"{launches_prefix}_{period}"]), 0).cast(BigInteger)
                              .label(f"{launches_prefix}_{period}") for period, _ in periods)
        stmt = select(*totals)
        res = (await self.db.execute(stmt)).first()
        
        g_u_all = res.u_all if res and res.u_all > 0 else 0
        g_users = {
            "all_time": res.u_all or 0,
            "30d": res.u_30d or 0,
            "24h": res.u_24h or 0,
            "1h": res.u_1h or 0,
        }

        vip_conversion = round((res.vip_all / g_u_all) * 100, 2) if g_u_all > 0 else 0
        total_devices = res.pc_all + res.mob_all
        pc_ratio = round((res.pc_all / total_devices) * 100, 2) if total_devices > 0 else 0
        mob_ratio = round((res.mob_all / total_devices) * 100, 2) if total_devices > 0 else 0

        global_data = {
            "metrics": {
                "vip_conversion": vip_conversion,
                "pc_ratio": pc_ratio,
                "mobile_ratio": mob_ratio,
            },
            "users": {
                "total": g_users,
                "vip": {"all_time": res.vip_all, "30d": res.vip_30d, "24h": res.vip_24h, "1h": res.vip_1h},
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
                    "vip_users": {"all_time": res.pc_vip_all, "30d": res.pc_vip_30d, "24h": res.pc_vip_24h, "1h": res.pc_vip_1h},
                    "launches": {"all_time": res.pc_l_all, "30d": res.pc_l_30d, "24h": res.pc_l_24h, "1h": res.pc_l_1h},
                    **LaunchRepository._period_metrics(
                        {"all_time": res.pc_all, "30d": res.pc_30d, "24h": res.pc_24h, "1h": res.pc_1h},
                        {"all_time": res.pc_l_all, "30d": res.pc_l_30d, "24h": res.pc_l_24h, "1h": res.pc_l_1h},
                        g_users,
                        {"all_time": res.pc_vip_all, "30d": res.pc_vip_30d, "24h": res.pc_vip_24h, "1h": res.pc_vip_1h},
                    ),
                },
                "mobile": {
                    "users": {"all_time": res.mob_all, "30d": res.mob_30d, "24h": res.mob_24h, "1h": res.mob_1h},
                    "vip_users": {"all_time": res.mob_vip_all, "30d": res.mob_vip_30d, "24h": res.mob_vip_24h, "1h": res.mob_vip_1h},
                    "launches": {"all_time": res.mob_l_all, "30d": res.mob_l_30d, "24h": res.mob_l_24h, "1h": res.mob_l_1h},
                    **LaunchRepository._period_metrics(
                        {"all_time": res.mob_all, "30d": res.mob_30d, "24h": res.mob_24h, "1h": res.mob_1h},
                        {"all_time": res.mob_l_all, "30d": res.mob_l_30d, "24h": res.mob_l_24h, "1h": res.mob_l_1h},
                        g_users,
                        {"all_time": res.mob_vip_all, "30d": res.mob_vip_30d, "24h": res.mob_vip_24h, "1h": res.mob_vip_1h},
                    ),
                }
            }
        }
        return global_data, g_users

    async def _get_servers(self, d30, d1, d1h, g_users):
        stmt = (
            select(
                LaunchModel.server,
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
            .where(LaunchModel.server != 200)
            .group_by(LaunchModel.server)
            .order_by(LaunchModel.server.asc())
        )
        res = await self.db.execute(stmt)
        result = []
        for row in res.all():
            users = {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h}
            launches = {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h, "1h": row.l_1h}
            vip_users = {"all_time": row.vip_all, "30d": row.vip_30d, "24h": row.vip_24h, "1h": row.vip_1h}
            metrics = self._period_metrics(users, launches, g_users, vip_users)
            result.append({
                "server": row.server,
                "user_share": metrics["user_share"],
                "launches_per_user": metrics["launches_per_user"],
                "vip_percent": metrics["vip_percent"],
                "users": users,
                "vip_users": vip_users,
                "launches": launches,
            })
        return result

    async def _get_factions(self, d30, d1, d1h, g_users):
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
        result = []
        for row in res.all():
            users = {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h}
            launches = {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h, "1h": row.l_1h}
            vip_users = {"all_time": row.vip_all, "30d": row.vip_30d, "24h": row.vip_24h, "1h": row.vip_1h}
            metrics = self._period_metrics(users, launches, g_users, vip_users)
            result.append({
                "mode": row.m_name,
                "user_share": metrics["user_share"],
                "launches_per_user": metrics["launches_per_user"],
                "vip_percent": metrics["vip_percent"],
                "users": users,
                "vip_users": vip_users,
                "launches": launches,
            })
        return result

    async def _get_versions(self, d30, d1, d1h, g_users):
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
        result = []
        for row in res.all():
            users = {"all_time": row.u_all, "30d": row.u_30d, "24h": row.u_24h, "1h": row.u_1h}
            launches = {"all_time": row.l_all, "30d": row.l_30d, "24h": row.l_24h, "1h": row.l_1h}
            metrics = self._period_metrics(users, launches, g_users)
            result.append({
                "version": row.version,
                "user_share": metrics["user_share"],
                "launches_per_user": metrics["launches_per_user"],
                "users": users,
                "launches": launches,
            })
        return result

    async def _get_products(self, d30, d1, d1h, g_users):
        families = [
            ("arizona_pc", LaunchModel.server.between(1, 33)),
            ("arizona_mobile", LaunchModel.server.between(101, 103)),
            ("rodina_pc", LaunchModel.server.between(301, 307)),
            ("rodina_mobile", LaunchModel.server.between(401, 403)),
        ]

        periods = (("30d", d30), ("24h", d1), ("1h", d1h))
        product = case(*((condition, name) for name, condition in families))
        is_vip = LaunchModel.version.ilike('%VIP%')
        # Product ranges do not overlap. De-duplicate HWIDs inside each product,
        # preserving users who played on multiple servers of the same product.
        per_user = select(
            product.label("product"),
            func.max(LaunchModel.launched_at).label("last_seen"),
            func.count(case((is_vip, 1))).label("vip_events"),
            func.max(case((is_vip, LaunchModel.launched_at))).label("vip_last"),
            func.count().label("l_all"),
            *(func.count(case((LaunchModel.launched_at >= since, 1))).label(f"l_{period}")
              for period, since in periods),
        ).where(product.is_not(None)).group_by(product, LaunchModel.hwid).subquery()
        stmt = select(
            per_user.c.product,
            func.count().label("u_all"),
            *(func.count(case((per_user.c.last_seen >= since, 1))).label(f"u_{period}")
              for period, since in periods),
            func.count(case((per_user.c.vip_events > 0, 1))).label("vip_all"),
            *(func.count(case((per_user.c.vip_last >= since, 1))).label(f"vip_{period}")
              for period, since in periods),
            *(func.sum(per_user.c[f"l_{period}"]).cast(BigInteger).label(f"l_{period}")
              for period in ("all", "30d", "24h", "1h")),
        ).group_by(per_user.c.product)
        rows = {row.product: row for row in (await self.db.execute(stmt)).all()}
        products = []
        for name, _ in families:
            row = rows.get(name)
            users = {
                "all_time": row.u_all if row else 0,
                **{period: getattr(row, f"u_{period}") if row else 0 for period, _ in periods},
            }
            launches = {
                "all_time": row.l_all if row else 0,
                **{period: getattr(row, f"l_{period}") if row else 0 for period, _ in periods},
            }
            vip_users = {
                "all_time": row.vip_all if row else 0,
                **{period: getattr(row, f"vip_{period}") if row else 0 for period, _ in periods},
            }
            metrics = self._period_metrics(users, launches, g_users, vip_users)
            products.append({
                "product": name,
                "user_share": metrics["user_share"],
                "launches_per_user": metrics["launches_per_user"],
                "vip_percent": metrics["vip_percent"],
                "users": users,
                "vip_users": vip_users,
                "launches": launches,
            })
        return products

    async def _get_timeline_daily(self):
        stmt = (
            select(
                func.date(LaunchModel.launched_at).label("dt"),
                func.count(distinct(LaunchModel.hwid)).label("u_all"),
                func.count(distinct(case((LaunchModel.version.ilike("%VIP%"), LaunchModel.hwid)))).label("vip_all"),
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
                "vip_users": row.vip_all,
                "launches": row.l_all,
                "launches_per_user": self._launches_per_user(row.u_all, row.l_all),
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
                "launches": row.l_all,
                "launches_per_user": self._launches_per_user(row.u_all, row.l_all),
            }
            for row in res.all()
        ]

    async def get_heavy_public_stats(self):
        now = datetime.now(timezone.utc)
        d30 = now - timedelta(days=30)
        d1 = now - timedelta(hours=24)
        d1h = now - timedelta(hours=1)

        global_data, g_users = await self._get_global(d30, d1, d1h)

        factions = await self._get_factions(d30, d1, d1h, g_users)
        servers = await self._get_servers(d30, d1, d1h, g_users)
        versions = await self._get_versions(d30, d1, d1h, g_users)
        products = await self._get_products(d30, d1, d1h, g_users)
        
        timeline_daily = await self._get_timeline_daily()
        
        activity_hourly = await self._get_activity_hourly()

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
                "versions": versions,
                "products": products,
            },
            "analytics": {
                "timeline": {
                    "daily": timeline_daily,
                },
                "activity": {
                    "hourly": activity_hourly
                }
            }
        }
