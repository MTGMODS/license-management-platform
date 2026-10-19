from datetime import datetime, timedelta, timezone
import json
from unittest.mock import AsyncMock

import fakeredis
import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

pytestmark = [pytest.mark.component("services/license"), pytest.mark.anyio, pytest.mark.integration]


@pytest.fixture
def service(component, db, monkeypatch):
    module = component("app.application.service")
    monkeypatch.setattr(module.UserServiceClient, "get_user_profile", AsyncMock(return_value={"nickname": "Tester"}))
    return module.LicenseService(db)


async def purchase(component, service, **overrides):
    values = dict(amount=5, method="Stars", duration_days=30, max_devices=2, reset_limit=1)
    values.update(overrides)
    dto = component("app.domain.schemas").GeneratePurchaseDTO(**values)
    return await service.generate_and_bill(dto)


async def activate(component, service, key, user_id=42, force=False):
    dto = component("app.domain.schemas").ActivateKeyDTO(key=key, force=force)
    return await service.activate_key_for_user(dto, user_id)


@pytest.fixture
async def old_stats_cache(component, monkeypatch):
    cache_class = component("app.infrastructure.stats_cache").PublicStatsCache
    main = component("app.main")
    async with fakeredis.aioredis.FakeRedis() as redis:
        cache = cache_class(redis, "mtgmods:license:old_stats:v3")
        monkeypatch.setattr(main.app.state, "old_stats_cache", cache, raising=False)
        yield cache


async def test_purchase_activation_check_and_dashboard(component, db, service):
    keys, tx_ids = await purchase(component, service, count=2)
    assert len(set(keys)) == len(tx_ids) == 2
    assert all(len(key) == 19 for key in keys)
    license_id = await activate(component, service, keys[0])
    await service.complete_purchase(license_id, 42)
    assert await service.check_for_client(keys[0], "device-123", "127.0.0.1", "test") == (
        200, {"valid": True, "user": "Tester", "id": 42},
    )
    db.expire_all()  # Re-query relationships as a new HTTP request would.
    info = await service.get_license_info(42)
    assert info["license"]["status"] == "ACTIVE"
    assert info["transaction"]["status"] == "COMPLETED"
    assert info["transaction"]["amount"] == 5
    assert info["devices"][0]["hwid"] == "dev******123"
    assert info["license"]["expires_at"].endswith("Z")


@pytest.mark.parametrize("status,owned,elapsed,expected", [
    ("NOT_ACTIVATED", False, False, {"valid": False, "expires": False, "error": "NOT_ACTIVATED"}),
    ("ACTIVE", True, True, {"valid": False, "expires": True}),
    ("EXPIRED", True, False, {"valid": False, "expires": True}),
    ("BANNED", True, False, {"valid": False, "expires": True}),
])
async def test_invalid_license_cannot_register_device(component, db, service, status, owned, elapsed, expected):
    repo = component("app.infrastructure.repository")
    row = repo.LicenseModel(key="AAAA-BBBB-CCCC-DDDD", status=status, user_id=42 if owned else None,
                            expires_at=datetime.now(timezone.utc) - timedelta(days=1) if elapsed else None)
    db.add(row)
    await db.commit()
    code, body = await service.check_for_client(row.key, "device-123", "127.0.0.1", "test")
    assert code == 200 and body == expected
    assert await db.scalar(select(func.count()).select_from(repo.DeviceModel)) == 0
    service.user_client.get_user_profile.assert_not_awaited()


async def test_missing_key(service):
    assert await service.check_for_client("AAAA-BBBB-CCCC-DDDD", "device", "ip", "ua") == (404, {"detail": "Key not found"})


async def test_device_limit_reuse_and_reset(component, db, service):
    keys, _ = await purchase(component, service, max_devices=1)
    await activate(component, service, keys[0])
    assert (await service.check_for_client(keys[0], "device-one", "ip1", "ua"))[0] == 200
    db.expire_all()
    assert (await service.check_for_client(keys[0], "device-one", "ip2", "ua"))[0] == 200
    db.expire_all()
    assert (await service.check_for_client(keys[0], "device-two", "ip", "ua"))[0] == 403
    info = await service.get_license_info(42)
    assert len(info["devices"]) == 1 and info["devices"][0]["ip"] == "ip2"
    await service.reset_device(42, info["devices"][0]["id"])
    db.expire_all()
    assert (await service.get_license_info(42))["license"]["reset_limit"] == 0
    assert (await service.check_for_client(keys[0], "device-two", "ip", "ua"))[0] == 200
    db.expire_all()
    with pytest.raises(component("app.shared.exceptions").DomainException) as exc:
        await service.reset_device(42, 999)
    assert exc.value.error_code == "RESET_LIMIT_REACHED"


async def test_cannot_reset_other_users_device(component, db, service):
    keys, _ = await purchase(component, service, count=2)
    await activate(component, service, keys[0], 42)
    await activate(component, service, keys[1], 43)
    await service.check_for_client(keys[1], "private-device", "ip", "ua")
    db.expire_all()
    other = await service.get_license_info(43)
    with pytest.raises(component("app.shared.exceptions").DomainException) as exc:
        await service.reset_device(42, other["devices"][0]["id"])
    assert exc.value.status_code == 404
    assert (await service.get_license_info(42))["license"]["reset_limit"] == 1
    assert len((await service.get_license_info(43))["devices"]) == 1


async def test_activation_conflict_force_and_reuse(component, service):
    keys, _ = await purchase(component, service, count=2)
    await activate(component, service, keys[0])
    error = component("app.shared.exceptions").DomainException
    with pytest.raises(error) as exc:
        await activate(component, service, keys[1])
    assert exc.value.status_code == 409
    await activate(component, service, keys[1], force=True)
    assert (await service.get_license_info(42))["license"]["key"] == keys[1]
    assert (await service.get_license_history(42))[0]["license"]["status"] == "EXPIRED"
    with pytest.raises(error) as exc:
        await activate(component, service, keys[1], user_id=99)
    assert exc.value.error_code == "INVALID_KEY"


async def test_forever_license_has_no_expiry(component, service):
    keys, _ = await purchase(component, service, duration_days=None)
    await activate(component, service, keys[0])
    assert (await service.get_license_info(42))["license"]["expires_at"] is None


async def test_expiry_only_deactivates_elapsed_active_licenses(component, db):
    repo = component("app.infrastructure.repository")
    now = datetime.now(timezone.utc)
    db.add_all([
        repo.LicenseModel(key="expired", user_id=1, status="ACTIVE", expires_at=now-timedelta(days=1)),
        repo.LicenseModel(key="future", user_id=2, status="ACTIVE", expires_at=now+timedelta(days=1)),
        repo.LicenseModel(key="forever", user_id=3, status="ACTIVE"),
        repo.LicenseModel(key="banned", user_id=4, status="BANNED", expires_at=now-timedelta(days=1)),
    ])
    await db.commit()
    repository = repo.LicenseRepository(db)
    assert [row["user_id"] for row in await repository.deactivate_expired_licenses()] == [1]
    await db.commit()
    assert await repository.deactivate_expired_licenses() == []
    assert (await repository.get_by_key("forever")).status == "ACTIVE"


async def test_delete_cascades_devices_and_purchase(component, db, service):
    repo = component("app.infrastructure.repository")
    keys, _ = await purchase(component, service)
    license_id = await activate(component, service, keys[0])
    await service.check_for_client(keys[0], "device", "ip", "ua")
    db.expire_all()
    await service.admin_delete_license(license_id)
    for model in (repo.LicenseModel, repo.DeviceModel, repo.TransactionModel):
        assert await db.scalar(select(func.count()).select_from(model)) == 0


@pytest.mark.parametrize("field,value", [("max_devices", None), ("max_devices", 0), ("reset_limit", None),
    ("reset_limit", -1), ("count", 0), ("count", 1001), ("amount", -1), ("duration_days", 0)])
async def test_purchase_input_validation(component, field, value):
    values = dict(amount=5, method="Stars", max_devices=2, reset_limit=1)
    values[field] = value
    with pytest.raises(ValidationError):
        component("app.domain.schemas").GeneratePurchaseDTO(**values)


async def test_http_check_contract_and_validation(api, component, service):
    keys, _ = await purchase(component, service)
    await activate(component, service, keys[0])
    response = await api.post("/api/v1/license/check", json={"key": keys[0], "device": "client-device"})
    assert response.status_code == 200 and response.json()["valid"] is True
    invalid = await api.post("/api/v1/license/check", json={"key": "short", "device": "x"})
    assert invalid.status_code == 422 and invalid.json()["error_code"] == "VALIDATION_ERROR"


async def test_private_routes_require_access_token(api):
    response = await api.get("/api/v1/license/info", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401


async def test_sales_stats_exclude_pending_free_and_unowned_keys(component, db, service):
    # One paid subscriber and one paid forever license; other keys are not sales.
    for user_id, overrides in [(1, {}), (2, {"duration_days": None, "amount": 20}),
                               (3, {"amount": 0}), (4, {"status": "PENDING"})]:
        keys, _ = await purchase(component, service, **overrides)
        await activate(component, service, keys[0], user_id)
    await purchase(component, service, amount=999)  # Not activated/owned.
    stats = await service.license_repo.get_heavy_public_stats()
    assert stats["subscriptions"]["overview"]["total_sold"] == 1
    assert stats["subscriptions"]["overview"]["total_money"] == 5
    assert "forever" not in stats
    old_stats = await service.license_repo.get_old_stats()
    assert set(old_stats) == {"updated_at", "forever"}
    assert datetime.fromisoformat(old_stats["updated_at"]).tzinfo == timezone.utc
    assert old_stats["forever"]["overview"] == {
        "paid_sold": 1, "total_money": 20, "avg_check": 20,
        "activated": 0, "activation_tracking_since": "2026-09-01",
    }


async def test_sales_purchase_sequence_and_tariff_transitions(component, db):
    repo = component("app.infrastructure.repository")
    start = datetime(2026, 10, 1, tzinfo=timezone.utc)

    async def add(user, days, amount, offset, *, status="COMPLETED"):
        row = repo.LicenseModel(
            key=f"synthetic-{len(db.new)}-{user}-{offset}-{days}-{amount}",
            user_id=user, duration_days=days, status="EXPIRED",
            activated_at=start + timedelta(days=offset) if offset is not None else None,
        )
        db.add(row)
        await db.flush()
        db.add(repo.TransactionModel(
            license_id=row.id, user_id=user, amount=amount,
            payment_method="Stars", status=status,
        ))
        await db.flush()

    # Lifetime, promo, pending and unowned keys must not affect the sequence.
    await add(42, None, 20, -3)
    await add(42, 365, 0, -2)
    await add(42, 90, 9, -1, status="PENDING")
    await add(None, 7, 999, -1)
    await add(42, 7, 1, 0)
    await add(42, 30, 3, 1)
    await add(42, 90, 6, 1)  # Equal timestamps are ordered by license ID.
    await add(43, 30, 3, 1)
    await add(43, 90, 6, 2)
    await add(42, 365, 15, None)  # No reliable date: not classified or chained.
    await db.commit()

    stats = await repo.LicenseRepository(db).get_heavy_public_stats()
    subs = stats["subscriptions"]
    assert subs["overview"]["total_sold"] == 6
    assert [sale["purchase_kind"] for sale in subs["sales"]] == [
        "repeat", "first", "repeat", "repeat", "first", None,
    ]
    assert subs["retention"]["tariff_transitions"] == [
        {"from_days": 30, "to_days": 90, "count": 2, "sum": 12, "share": 66.7},
        {"from_days": 7, "to_days": 30, "count": 1, "sum": 3, "share": 33.3},
    ]
    for sale in subs["sales"]:
        assert not {"id", "user_id", "key", "previous_duration", "purchase_number"} & sale.keys()


async def test_empty_sales_have_no_tariff_transitions(component, db):
    stats = await component("app.infrastructure.repository").LicenseRepository(db).get_heavy_public_stats()
    assert stats["subscriptions"]["sales"] == []
    assert stats["subscriptions"]["retention"]["tariff_transitions"] == []


async def test_old_stats_cache_reuses_data_and_refreshes_after_deletion(
    api, component, service, old_stats_cache, monkeypatch,
):
    stats_class = component("app.application.service").LicenseStatsService
    loader = AsyncMock(wraps=stats_class._load_old_stats)
    monkeypatch.setattr(stats_class, "_load_old_stats", loader)

    async def expire_cache():
        entry = json.loads(await old_stats_cache.redis.get(old_stats_cache.key))
        entry["fresh_until"] = 0
        await old_stats_cache.redis.set(
            old_stats_cache.key, json.dumps(entry), ex=old_stats_cache.RETENTION_SECONDS,
        )

    forever_ids = []
    for user_id, overrides in [
        (1, {"duration_days": None, "amount": 20, "method": "Steam"}),
        (2, {"duration_days": None, "amount": 10, "method": "Card"}),
        (3, {"duration_days": None, "amount": 0}),
        (4, {"duration_days": None, "amount": 999, "status": "PENDING"}),
        (5, {"duration_days": 30, "amount": 500}),
    ]:
        keys, _ = await purchase(component, service, **overrides)
        forever_ids.append(await activate(component, service, keys[0], user_id))

    class StatsClock(datetime):
        current = datetime(2026, 10, 6, 12, tzinfo=timezone.utc)

        @classmethod
        def now(cls, tz=None):
            return cls.current.astimezone(tz)

    monkeypatch.setattr(component("app.infrastructure.repository"), "datetime", StatsClock)
    response = await api.get("/api/v1/license/stats/old")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert set(response.json()) == {"updated_at", "forever"}
    assert response.json()["updated_at"] == "2026-10-06T12:00:00Z"
    forever = response.json()["forever"]
    assert forever["overview"] == {
        "paid_sold": 2, "total_money": 30, "avg_check": 15,
        "activated": 0, "activation_tracking_since": "2026-09-01",
    }
    assert forever["by_method"] == [
        {"method": "Steam", "count": 1, "sum": 20, "money_share": 66.7},
        {"method": "Card", "count": 1, "sum": 10, "money_share": 33.3},
    ]
    assert forever["by_price"] == [
        {"price": 10, "count": 1, "sum": 10, "count_share": 50, "money_share": 33.3},
        {"price": 20, "count": 1, "sum": 20, "count_share": 50, "money_share": 66.7},
    ]
    loader.assert_awaited_once()
    assert (await api.get("/api/v1/license/stats/old")).json()["forever"] == forever
    loader.assert_awaited_once()

    await service.admin_delete_license(forever_ids[0])
    StatsClock.current += timedelta(minutes=5)
    # Fresh data stays cached; a stale request returns it while refreshing in the background.
    fresh = (await api.get("/api/v1/license/stats/old")).json()
    assert fresh["forever"] == forever
    assert fresh["updated_at"] == "2026-10-06T12:00:00Z"
    loader.assert_awaited_once()
    await expire_cache()
    stale_response = (await api.get("/api/v1/license/stats/old")).json()
    assert stale_response["forever"] == forever
    assert stale_response["updated_at"] == "2026-10-06T12:00:00Z"
    assert loader.await_count == 2
    response = await api.get("/api/v1/license/stats/old")
    assert response.json()["updated_at"] == "2026-10-06T12:05:00Z"
    assert response.json()["forever"]["overview"] == {
        "paid_sold": 1, "total_money": 10, "avg_check": 10,
        "activated": 0, "activation_tracking_since": "2026-09-01",
    }
    await service.admin_delete_license(forever_ids[1])
    await expire_cache()
    stale = (await api.get("/api/v1/license/stats/old")).json()["forever"]
    assert stale["overview"]["paid_sold"] == 1
    empty = (await api.get("/api/v1/license/stats/old")).json()["forever"]
    assert empty == {
        "overview": {"paid_sold": 0, "total_money": 0, "avg_check": 0,
                     "activated": 0, "activation_tracking_since": "2026-09-01"},
        "by_method": [], "by_price": [],
    }
    assert loader.await_count == 3


async def test_legacy_active_counts_keys_with_devices_not_validity_or_payment(component, db):
    repo = component("app.infrastructure.repository")
    keys = [
        repo.LicenseModel(key="used-forever", status="BANNED"),
        repo.LicenseModel(key="unused-forever", status="ACTIVE"),
        repo.LicenseModel(key="used-subscription", status="ACTIVE", duration_days=30),
        repo.LicenseModel(key="free-used-forever", status="ACTIVE"),
    ]
    db.add_all(keys)
    await db.flush()
    for key, device in [(keys[0], "pc"), (keys[0], "phone"), (keys[2], "pc"), (keys[3], "pc")]:
        db.add(repo.DeviceModel(license_id=key.id, device=device))
    await db.commit()
    overview = (await repo.LicenseRepository(db).get_old_stats())["forever"]["overview"]
    assert overview["activated"] == 2
    assert overview["activation_tracking_since"] == "2026-09-01"
    assert overview["paid_sold"] == 0


async def test_admin_duration_update_and_ban(component, service):
    keys, _ = await purchase(component, service)
    license_id = await activate(component, service, keys[0])
    schema = component("app.domain.schemas").UpdateLicenseDTO
    updated = await service.admin_update_license(license_id, schema(duration_days=None, max_devices=3))
    assert updated["expires_at"] is None and updated["max_devices"] == 3
    updated = await service.admin_update_license(license_id, schema(status="BANNED"))
    assert updated["status"] == "BANNED" and updated["expires_at"] is not None
    assert (await service.check_for_client(keys[0], "new-device", "ip", "ua"))[1]["valid"] is False


async def test_download_requires_vip_and_preserves_rpc_payload(component, api, service, monkeypatch):
    routes = component("app.api.user_routes")
    main = component("app.main")
    auth = component("app.application.jwt_utils")
    main.app.dependency_overrides[auth.get_current_user_id] = lambda: 42
    publish = AsyncMock(return_value="https://files.invalid/abcdef1234")
    monkeypatch.setattr(routes, "publish_file_generation_event", publish)
    response = await api.post("/api/v1/license/download")
    assert response.status_code == 403
    publish.assert_not_awaited()
    keys, _ = await purchase(component, service, duration_days=None)
    await activate(component, service, keys[0])
    response = await api.post("/api/v1/license/download")
    assert response.status_code == 200 and response.json()["download_url"] == "https://files.invalid/abcdef1234"
    publish.assert_awaited_once_with(user_id=42, expire_date=None)
    publish.side_effect = RuntimeError("offline")
    response = await api.post("/api/v1/license/download")
    assert response.status_code == 500 and response.json()["error_code"] == "FILE_GENERATION_FAILED"
