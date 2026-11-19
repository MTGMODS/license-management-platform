from datetime import datetime, timedelta, timezone

import fakeredis.aioredis
import jwt
import pytest
from redis.exceptions import ConnectionError
from unittest.mock import AsyncMock

pytestmark = [pytest.mark.component("services/license"), pytest.mark.anyio, pytest.mark.integration]


@pytest.fixture
async def cache(component, monkeypatch):
    cache = component("app.infrastructure.vip_list_cache").vip_list_cache
    async with fakeredis.aioredis.FakeRedis(decode_responses=True) as redis:
        monkeypatch.setattr(cache, "redis", redis)
        yield cache


def auth(component, user_id=42):
    settings = component("app.shared.config").settings
    token = jwt.encode({"sub": str(user_id), "type": "access"}, settings.JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


async def seed(component, db, user_id=42, status="ACTIVE", expires_at=None):
    repo = component("app.infrastructure.repository")
    row = repo.LicenseModel(user_id=user_id, key=f"TEST-{user_id:04d}-AAAA-BBBB", status=status, expires_at=expires_at)
    db.add(row)
    await db.commit()
    return row


async def test_account_api_owner_isolation_and_public_list(component, api, db, cache):
    path = "/api/v1/license/me/game-account"
    public = "/api/v1/license/game-accounts/public-list"
    assert "/api/v1/license/game-accounts/list" not in component("app.main").app.openapi()["paths"]
    assert (await api.get(path)).status_code in (401, 403)
    assert (await api.put(path, json={"server_id": 20, "nickname": "Test_Player"})).status_code in (401, 403)
    assert (await api.delete(path)).status_code in (401, 403)
    headers = auth(component)
    assert (await api.get(path, headers=headers)).json() is None
    payload = {"server_id": 20, "nickname": "Test_Player"}
    assert (await api.put(path, headers=headers, json=payload)).json() == payload
    assert (await api.get(path, headers=auth(component, 43))).json() is None
    assert (await api.get(public)).json() == []  # Stored settings are not an entitlement.
    row = await seed(component, db)
    await cache.invalidate()
    response = await api.get(public)
    assert response.json() == ["[20]Test_Player"]
    assert response.headers["cache-control"] == "no-store"
    assert await cache.redis.get(cache.key) is not None
    assert (await api.put(path, headers=headers, json={**payload, "nickname": "Next_Player"})).status_code == 200
    assert (await api.get(public)).json() == ["[20]Next_Player"]
    service = component("app.application.service").LicenseService(db)
    dto = component("app.domain.schemas").UpdateLicenseDTO
    await service.admin_update_license(row.id, dto(status="BANNED"))
    assert (await api.get(public)).json() == []
    assert (await api.get(path, headers=headers)).json()["nickname"] == "Next_Player"
    assert (await api.delete(path, headers=auth(component, 43))).status_code == 204
    assert (await api.get(path, headers=headers)).json() is not None
    assert (await api.delete(path, headers=headers)).status_code == 204
    assert (await api.get(path, headers=headers)).json() is None


@pytest.mark.parametrize("payload", [
    {"server_id": 0, "nickname": "Test_Player"},
    {"server_id": 999, "nickname": "Test_Player"},
    {"server_id": True, "nickname": "Test_Player"},
    {"server_id": "20", "nickname": "Test_Player"},
    {"server_id": 20, "nickname": "[1]Fake"},
    {"server_id": 20, "nickname": "Test Player"},
    {"server_id": 20, "nickname": "ab"},
    {"server_id": 20, "nickname": "A" * 51},
])
async def test_invalid_account_is_rejected(component, api, cache, payload):
    response = await api.put("/api/v1/license/me/game-account", headers=auth(component), json=payload)
    assert response.status_code == 422


@pytest.mark.parametrize("length", [25, 50])
async def test_long_nickname_roundtrips(component, api, cache, length):
    path = "/api/v1/license/me/game-account"
    payload = {"server_id": 20, "nickname": "A" * length}
    headers = auth(component)
    response = await api.put(path, headers=headers, json=payload)
    assert response.status_code == 200
    assert response.json() == payload
    assert (await api.get(path, headers=headers)).json() == payload


async def test_validity_expiry_deduplication_and_redis_failure(component, db, cache):
    repo = component("app.infrastructure.repository")
    now = datetime.now(timezone.utc)
    for user_id, status, expiry in [(1, "ACTIVE", None), (2, "ACTIVE", now - timedelta(seconds=1)),
                                    (3, "BANNED", None), (4, "EXPIRED", None),
                                    (5, "NOT_ACTIVATED", None), (6, "ACTIVE", now + timedelta(seconds=60))]:
        await seed(component, db, user_id, status, expiry)
        db.add(repo.GameAccountModel(user_id=user_id, server_id=20, nickname="Test_Player"))
    await db.commit()
    service = component("app.application.service").LicenseService(db)
    assert await service.get_vip_list() == ["[20]Test_Player"]
    assert 0 < await cache.redis.pttl(cache.key) <= 60_000
    cache.redis.mget = AsyncMock(side_effect=ConnectionError("offline"))
    assert await service.get_vip_list() == ["[20]Test_Player"]


async def test_cache_hits_and_invalidation_during_generation(cache):
    loader = AsyncMock(return_value=(["[20]Before_Player"], None))
    assert await cache.get(loader) == ["[20]Before_Player"]
    assert await cache.get(loader) == ["[20]Before_Player"]
    assert loader.await_count == 1
    await cache.invalidate()

    async def changing_loader():
        await cache.invalidate()
        return ["[20]Old_Player"], None

    calls = 0

    async def load():
        nonlocal calls
        calls += 1
        if calls == 1:
            return await changing_loader()
        return ["[20]New_Player"], None

    assert await cache.get(load) == ["[20]New_Player"]
    assert await cache.redis.get(cache.key) is None


async def test_activation_replacement_transfer_and_deletion_keep_settings(component, db, cache):
    service = component("app.application.service").LicenseService(db)
    schemas = component("app.domain.schemas")
    await service.save_game_account(42, schemas.GameAccountDTO(server_id=20, nickname="Test_Player"))
    assert await service.get_vip_list() == []
    keys, _ = await service.generate_and_bill(schemas.GeneratePurchaseDTO(
        count=2, amount=3, method="Stars", duration_days=30, max_devices=2, reset_limit=0,
    ))
    await service.activate_key_for_user(schemas.ActivateKeyDTO(key=keys[0]), 42)
    assert await service.get_vip_list() == ["[20]Test_Player"]
    license_id = await service.activate_key_for_user(schemas.ActivateKeyDTO(key=keys[1], force=True), 42)
    assert await service.get_vip_list() == ["[20]Test_Player"]
    await service.admin_update_license(license_id, schemas.UpdateLicenseDTO(user_id=43))
    assert await service.get_vip_list() == []
    await service.save_game_account(43, schemas.GameAccountDTO(server_id=1, nickname="Other_Player"))
    assert await service.get_vip_list() == ["[1]Other_Player"]
    await service.admin_delete_license(license_id)
    assert await service.get_vip_list() == []
    assert (await service.get_game_account(42))["nickname"] == "Test_Player"
    assert (await service.get_game_account(43))["nickname"] == "Other_Player"


async def test_expiry_worker_invalidates_before_social_side_effects(component, db, cache, monkeypatch):
    worker = component("app.application.worker")
    service = component("app.application.service").LicenseService(db)
    schemas = component("app.domain.schemas")
    row = await seed(component, db, expires_at=datetime.now(timezone.utc) + timedelta(minutes=5))
    await service.save_game_account(42, schemas.GameAccountDTO(server_id=20, nickname="Test_Player"))
    assert await service.get_vip_list() == ["[20]Test_Player"]
    row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db.commit()
    monkeypatch.setattr(worker.UserServiceClient, "get_social_ids_by_user_id", AsyncMock(return_value=None))

    class StopWorker(BaseException):
        pass

    monkeypatch.setattr(worker.asyncio, "sleep", AsyncMock(side_effect=StopWorker))
    with pytest.raises(StopWorker):
        await worker.check_expired_licenses_task()
    assert await cache.redis.get(cache.key) is None
    assert await service.get_vip_list() == []
