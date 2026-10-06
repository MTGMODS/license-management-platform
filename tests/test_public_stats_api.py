"""HTTP contract and cache reuse with real repositories on an isolated SQLite DB."""
import os
from pathlib import Path
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]

SCRIPT = """
import asyncio
import importlib
import os
from unittest.mock import AsyncMock, patch

import fakeredis
from fastapi.testclient import TestClient

from app.infrastructure.stats_cache import PublicStatsCache

service = os.environ["STATS_TEST_SERVICE"]
endpoint = os.environ["STATS_TEST_ENDPOINT"]
is_old = endpoint == "old"
main = importlib.import_module("app.main")
application = importlib.import_module("app.application.service")
stats_class = getattr(application, "LicenseStatsService" if service == "license" else "UsageStatsService")
async def idle_worker():
    await asyncio.Event().wait()
if service == "license":
    main.check_expired_licenses_task = idle_worker

server = fakeredis.FakeServer()
version = "v2" if service == "license" else "v1"
key = "mtgmods:license:old_stats:v1" if is_old else f"mtgmods:{service}:public_stats:{version}"
cache_attr = "old_stats_cache" if is_old else "public_stats_cache"
loader_method = "_load_old_stats" if is_old else "_load_stats"
loader = AsyncMock(wraps=getattr(stats_class, loader_method))
with patch.object(stats_class, loader_method, loader):
    for boot in range(2):
        with TestClient(main.app) as client:
            assert getattr(main.app.state, cache_attr).key == key
            cache = PublicStatsCache(
                fakeredis.aioredis.FakeRedis(server=server), key,
            )
            setattr(main.app.state, cache_attr, cache)
            response = client.get(f"/api/v1/{service}/stats/{endpoint}")
            assert response.status_code == 200, response.text
            body = response.json()
            assert "status" not in body and "data" not in body
            if is_old:
                assert set(body) == {"forever"}
                assert response.headers["cache-control"] == "no-store"
            elif service == "license":
                assert "updated_at" in body
                assert "subscriptions" in body and "forever" not in body
            else:
                assert "updated_at" in body
                assert "overview" in body and "analytics" in body
            if boot == 0:
                first = body
            assert body == first
            assert client.get("/health").status_code == 200
            loader.assert_awaited_once()
"""


@pytest.mark.parametrize("service,endpoint", [
    ("license", "public"), ("license", "old"), ("usage", "public"),
])
def test_stats_api_and_cache_reuse_after_application_restart(service, endpoint, tmp_path):
    env = dict(os.environ)
    env.update({
        "PYTHONPATH": str(ROOT / "services" / service),
        "STATS_TEST_SERVICE": service,
        "STATS_TEST_ENDPOINT": endpoint,
        "DATABASE_URL": "sqlite+aiosqlite:///:memory:",
        "DATABASE_POSTGRES_URL": "sqlite+aiosqlite:///:memory:",
        "DEBUG_MODE": "True",
        "API_VERSION": "v1",
        "APP_VERSION": "test",
        "REDIS_URL": "redis://127.0.0.1:1/0",
        "RABBITMQ_URL": "amqp://guest:guest@127.0.0.1/",
        "JWT_SECRET": "test-only-secret",
        "BOT_SECRET_TOKEN": "test-only-token",
        "INTERNAL_SECRET_TOKEN": "test-only-internal-token",
        "USER_SERVICE_URL": "http://127.0.0.1:1",
    })
    result = subprocess.run(
        [sys.executable, "-c", SCRIPT], cwd=tmp_path, env=env,
        capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
