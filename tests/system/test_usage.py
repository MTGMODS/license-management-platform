from datetime import datetime, timedelta, timezone
import random

import pytest
from sqlalchemy import and_, case, distinct, func, select

pytestmark = [pytest.mark.component("services/usage"), pytest.mark.anyio, pytest.mark.integration]

PAYLOAD = {"version": "1.2.3 Free", "mode": "police", "server": 1, "device": "PC", "hwid": "test-hwid"}


@pytest.mark.parametrize("field,value", [("server", 34), ("server", -1), ("mode", "unknown"),
    ("device", "CONSOLE"), ("hwid", "x"), ("version", "1.2"), ("version", "1.2 Premium")])
async def test_invalid_launch_is_not_saved(component, db, api, field, value):
    response = await api.post("/api/v1/usage/launch", json={**PAYLOAD, field: value})
    assert response.status_code == 422 and response.json()["error_code"] == "VALIDATION_ERROR"
    model = component("app.infrastructure.repository").LaunchModel
    assert await db.scalar(select(func.count()).select_from(model)) == 0


@pytest.mark.parametrize("server", [0, 1, 33, 101, 103, 200, 301, 307, 401, 403])
async def test_supported_server_ranges(component, server):
    assert component("app.domain.models").LaunchPayload(**{**PAYLOAD, "server": server}).server == server


async def test_launch_alias_persistence_and_unique_users(component, db, api):
    payload = {**PAYLOAD, "server_id": PAYLOAD["server"]}
    del payload["server"]
    for version in ("1.2.3 Free", "1.2.3 VIP"):
        response = await api.post("/api/v1/usage/launch", json={**payload, "version": version})
        assert response.status_code == 200 and response.json()["status"] == "success"
    # Fresh session: writes must actually be committed, not just in identity map.
    database = component("app.shared.database")
    repo = component("app.infrastructure.repository")
    async with database.AsyncSessionLocal() as other:
        rows = (await other.scalars(select(repo.LaunchModel))).all()
        assert len(rows) == 2 and all(row.server == 1 for row in rows)
        stats = await repo.LaunchRepository(other).get_heavy_public_stats()
    assert stats["overview"]["launches"]["all_time"] == 2
    assert stats["analytics"]["timeline"]["daily"][0]["users"] == 1
    assert stats["analytics"]["timeline"]["daily"][0]["vip_users"] == 1


async def test_stats_periods_exclude_old_launches(component, db):
    repo = component("app.infrastructure.repository")
    now = datetime.now(timezone.utc)
    for index, age in enumerate([timedelta(minutes=10), timedelta(hours=2), timedelta(days=2), timedelta(days=40)]):
        db.add(repo.LaunchModel(**{**PAYLOAD, "hwid": f"device-{index}"}, launched_at=now-age))
    await db.commit()
    stats = await repo.LaunchRepository(db).get_heavy_public_stats()
    assert stats["overview"]["launches"] == {"all_time": 4, "30d": 3, "24h": 2, "1h": 1}
    assert len(stats["distribution"]["servers"]) == 1
    assert stats["distribution"]["servers"][0]["server"] == 1


async def test_empty_stats_no_division_by_zero(component, db):
    stats = await component("app.infrastructure.repository").LaunchRepository(db).get_heavy_public_stats()
    assert stats["overview"]["launches"] == {"all_time": 0, "30d": 0, "24h": 0, "1h": 0}
    assert stats["analytics"]["timeline"]["daily"] == []
    assert stats["overview"]["metrics"]["pc_ratio"] == 0
    assert stats["overview"]["metrics"]["mobile_ratio"] == 0
    assert len(stats["distribution"]["products"]) == 4
    for product in stats["distribution"]["products"]:
        for counters in ("users", "vip_users", "launches"):
            assert product[counters] == {"all_time": 0, "30d": 0, "24h": 0, "1h": 0}


async def test_device_ratios_keep_two_decimal_places_and_count_unique_devices(component, db):
    repo = component("app.infrastructure.repository")
    for device, hwid in [("PC", "desktop"), ("PC", "desktop"),
                         ("MOBILE", "phone-one"), ("MOBILE", "phone-two")]:
        db.add(repo.LaunchModel(**{**PAYLOAD, "device": device, "hwid": hwid}))
    await db.commit()
    stats = await repo.LaunchRepository(db).get_heavy_public_stats()
    assert stats["overview"]["metrics"]["pc_ratio"] == 33.33
    assert stats["overview"]["metrics"]["mobile_ratio"] == 66.67


async def test_optimized_rollups_match_original_distinct_counts(component, db, monkeypatch):
    """Reference is the previous COUNT(DISTINCT CASE...) SQL, not the new rollup."""
    repo = component("app.infrastructure.repository")
    model = repo.LaunchModel
    now = datetime(2026, 10, 19, 12, tzinfo=timezone.utc)

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return now.astimezone(tz)

    monkeypatch.setattr(repo, "datetime", Clock)
    cutoffs = {"all_time": None, "30d": now - timedelta(days=30),
               "24h": now - timedelta(days=1), "1h": now - timedelta(hours=1)}
    randomizer = random.Random(2026)
    servers = [None, 0, 1, 33, 34, 101, 103, 104, 200, 301, 307, 401, 403, 404]
    ages = [None, timedelta(days=40), timedelta(days=30), timedelta(hours=24),
            timedelta(hours=1), timedelta(minutes=10), timedelta(minutes=-10)]
    values = []
    for _ in range(400):
        age = randomizer.choice(ages)
        values.append({
            "hwid": f"user-{randomizer.randrange(16)}",
            "device": randomizer.choice(["PC", "MOBILE", "UNKNOWN"]),
            "server": randomizer.choice(servers),
            "version": randomizer.choice(["1.9 Free", "1.9 VIP", "1.8 vip"]),
            "mode": randomizer.choice([None, "none", "police", "medic"]),
            "launched_at": now - age if age is not None else None,
        })
    # A NULL-only user still counts all-time, but not in any rolling period.
    # Check exact boundaries and one microsecond before each boundary too.
    values.append({**values[0], "hwid": "null-only", "launched_at": None})
    for period, cutoff in list(cutoffs.items())[1:]:
        for offset in [timedelta(0), timedelta(microseconds=1)]:
            values.append({**values[0], "hwid": f"boundary-{period}-{offset}",
                           "launched_at": cutoff - offset, "device": "PC", "server": 1, "version": "1.9 VIP"})
    await db.execute(model.__table__.insert(), values)
    await db.commit()
    stats = await repo.LaunchRepository(db).get_heavy_public_stats()

    async def reference(condition=None):
        columns = []
        for period, cutoff in cutoffs.items():
            matches = model.id.is_not(None) if cutoff is None else model.launched_at >= cutoff
            columns.extend([
                func.count(distinct(case((matches, model.hwid)))).label(f"users_{period}"),
                func.count(distinct(case((and_(matches, model.version.ilike('%VIP%')), model.hwid)))).label(f"vip_{period}"),
                func.count(case((matches, model.id))).label(f"launches_{period}"),
            ])
        stmt = select(*columns)
        if condition is not None:
            stmt = stmt.where(condition)
        row = (await db.execute(stmt)).one()._mapping
        return {name: {period: row[f"{prefix}_{period}"] for period in cutoffs}
                for name, prefix in [("users", "users"), ("vip_users", "vip"), ("launches", "launches")]}

    global_counts = await reference()
    assert stats["overview"]["users"] == {"total": global_counts["users"], "vip": global_counts["vip_users"]}
    assert stats["overview"]["launches"] == global_counts["launches"]
    pc = await reference(model.device == "PC")
    mobile = await reference(model.device == "MOBILE")
    for device, counts in [("pc", pc), ("mobile", mobile)]:
        for key, value in counts.items():
            assert stats["overview"]["devices"][device][key] == value
    device_total = pc["users"]["all_time"] + mobile["users"]["all_time"]
    assert stats["overview"]["metrics"] == {
        "vip_conversion": round(100 * global_counts["vip_users"]["all_time"] / global_counts["users"]["all_time"], 2),
        "pc_ratio": round(100 * pc["users"]["all_time"] / device_total, 2),
        "mobile_ratio": round(100 * mobile["users"]["all_time"] / device_total, 2),
    }
    products = stats["distribution"]["products"]
    assert [row["product"] for row in products] == ["arizona_pc", "arizona_mobile", "rodina_pc", "rodina_mobile"]
    for product, limits in zip(products, [(1, 33), (101, 103), (301, 307), (401, 403)]):
        counts = await reference(model.server.between(*limits))
        for key, value in counts.items():
            assert product[key] == value
        assert product["user_share"] == {
            period: round(100 * counts["users"][period] / global_counts["users"][period], 1)
            if global_counts["users"][period] else 0 for period in cutoffs
        }
        assert product["vip_percent"] == {
            period: round(100 * counts["vip_users"][period] / counts["users"][period], 1)
            if counts["users"][period] else 0 for period in cutoffs
        }
        assert product["launches_per_user"] == {
            period: round(counts["launches"][period] / counts["users"][period], 2)
            if counts["users"][period] else 0 for period in cutoffs
        }
