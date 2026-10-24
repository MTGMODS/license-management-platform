import os
import asyncio
import json
import struct
from datetime import datetime, timezone
from unittest.mock import AsyncMock

from fastapi import FastAPI
import httpx
import pytest

pytestmark = [pytest.mark.component("services/distribution"), pytest.mark.anyio, pytest.mark.integration]


@pytest.fixture
def builds(component, monkeypatch, tmp_path):
    module = component("app.application.service")
    template = tmp_path / "template.lua"
    output = tmp_path / "output"
    output.mkdir()
    monkeypatch.setattr(module, "BASE_TEMPLATE_PATH", str(template))
    monkeypatch.setattr(module, "BUILDS_DIR", str(output))
    return module, template, output


@pytest.mark.parametrize("source", ["-- Привіт\nfunction main()\nend", "function main() end", "function main(...) end"])
async def test_timed_build_injects_expiry_and_preserves_template(component, builds, source):
    module, template, output = builds
    template.write_text(source, encoding="cp1251")
    payload = component("app.domain.schemas").GenerationPayloadDTO(user_id=42, expire_date="2026-12-31T20:15:00Z")
    url = await module.DistributionService().build_vip_file(payload, "abcdef12-3456-7890")
    assert url.endswith("/abcdef1234")
    result = (output / "abcdef1234.lua").read_text(encoding="cp1251")
    assert "year=2026, month=12, day=31, hour=20, min=15" in result
    assert "os.remove(thisScript().path)" in result
    assert template.read_text(encoding="cp1251") == source


async def test_forever_build_has_no_time_bomb(component, builds):
    module, template, output = builds
    source = "function main() end"
    template.write_text(source, encoding="cp1251")
    payload = component("app.domain.schemas").GenerationPayloadDTO(user_id=42)
    await module.DistributionService().build_vip_file(payload, "abcdef1234")
    assert (output / "abcdef1234.lua").read_text(encoding="cp1251") == source


async def test_missing_template_fails_without_output(component, builds):
    module, _, output = builds
    with pytest.raises(RuntimeError, match="template is missing"):
        await module.DistributionService().build_vip_file(component("app.domain.schemas").GenerationPayloadDTO(user_id=42), "abcdef1234")
    assert list(output.iterdir()) == []


async def test_download_response_deletes_file_after_delivery(component, builds, monkeypatch):
    _, _, output = builds
    routes = component("app.api.routes")
    errors = component("app.shared.exceptions")
    monkeypatch.setattr(routes, "BUILDS_DIR_PATH", output)
    app = FastAPI()
    app.include_router(routes.router)
    app.add_exception_handler(errors.DomainException, errors.global_exception_handler)
    file = output / "abcdef1234.lua"
    file.write_bytes(b"function main() end")
    executable = file.with_suffix(".exe")
    executable.write_bytes(b"unused installer")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/files/downloads/vip/abcdef1234")
        assert response.status_code == 200 and response.content == b"function main() end"
        assert "Arizona%20Helper.lua" in response.headers["content-disposition"] or "Arizona Helper.lua" in response.headers["content-disposition"]
        assert not file.exists()
        assert not executable.exists()
        assert (await client.get("/api/v1/files/downloads/vip/abcdef1234")).status_code == 404
        assert (await client.get("/api/v1/files/downloads/vip/not-a-token")).status_code == 422


@pytest.fixture
def installer_api(component, builds, monkeypatch, tmp_path):
    module, _, output = builds
    template = tmp_path / "installer" / "template.exe"
    template.parent.mkdir()
    # Same binary URL overlay contract as WindowsInstaller/installer/payload.py.
    key = bytes.fromhex("5a19c37ea144d80b6f9231e45827bc0d")
    raw = json.dumps({"url": "https://example.invalid/free.lua"}).encode()
    cipher = bytes(byte ^ key[index % len(key)] for index, byte in enumerate(raw))
    template.write_bytes(b"MZ" + b"fake executable body" * 20 + cipher + b"MTGPAY01" + struct.pack("<I", len(cipher)))
    original = template.read_bytes()
    monkeypatch.setattr(module, "INSTALLER_TEMPLATE_PATH", str(template))
    routes = component("app.api.routes")
    monkeypatch.setattr(routes, "BUILDS_DIR_PATH", output)
    errors = component("app.shared.exceptions")
    app = FastAPI()
    app.include_router(routes.router)
    app.add_exception_handler(errors.DomainException, errors.global_exception_handler)
    return app, template, original, output


async def test_installer_download_then_lua_preserves_template_and_finishes_cleanup(installer_api):
    app, template, original, output = installer_api
    lua = output / "abcdef1234.lua"
    lua.write_bytes(b"personal VIP file")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/files/downloads/vip/abcdef1234.exe")
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
        blob = response.content
        assert blob[-12:-4] == b"MTGPAY01"
        length = struct.unpack("<I", blob[-4:])[0]
        key = bytes.fromhex("5a19c37ea144d80b6f9231e45827bc0d")
        payload = json.loads(bytes(byte ^ key[index % len(key)] for index, byte in enumerate(blob[-12-length:-12])))
        assert payload == {
            "name": "Arizona&Rodina Helper", "filename": "Arizona Helper.lua",
            "url": "https://files.invalid/api/v1/files/downloads/vip/abcdef1234",
        }
        previous_length = struct.unpack("<I", original[-4:])[0]
        assert blob[:-12-length] == original[:-12-previous_length]
        assert lua.read_bytes() == b"personal VIP file"
        assert not (output / "abcdef1234.exe").exists()
        assert template.read_bytes() == original
        marker = output / "abcdef1234.exe.used"
        assert marker.is_file()
        repeated = await client.get("/api/v1/files/downloads/vip/abcdef1234.exe")
        assert repeated.status_code == 404
        assert lua.read_bytes() == b"personal VIP file"

        installed = await client.get("/api/v1/files/downloads/vip/abcdef1234")
        assert installed.status_code == 200 and installed.content == b"personal VIP file"
        assert not lua.exists()
        assert not marker.exists()
        assert (await client.get("/api/v1/files/downloads/vip/abcdef1234.exe")).status_code == 404
        assert (await client.get("/api/v1/files/downloads/vip/abcdef1234")).status_code == 404
        assert template.read_bytes() == original


async def test_legacy_free_installer_redirects_without_serving_template(installer_api):
    app, template, original, output = installer_api
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        for _ in range(2):
            response = await client.get("/api/v1/files/downloads/installer")
            assert response.status_code == 307
            assert response.headers["location"] == "https://mtgmods.com/helper/download/installer"
            assert response.content == b""
        assert template.read_bytes() == original
        assert list(output.iterdir()) == []
        assert (await client.get("/api/v1/files/downloads/vip/not-a-token.exe")).status_code == 422
        assert (await client.get("/api/v1/files/downloads/vip/abcdef1234.exe")).status_code == 404


async def test_parallel_installer_requests_only_allow_one_download(installer_api):
    app, template, original, output = installer_api
    lua = output / "abcdef1234.lua"
    lua.write_bytes(b"VIP")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        responses = await asyncio.gather(*[
            client.get("/api/v1/files/downloads/vip/abcdef1234.exe") for _ in range(3)
        ])
    assert sorted(response.status_code for response in responses) == [200, 404, 404]
    assert lua.exists() and template.read_bytes() == original
    assert not list(output.glob("*.exe")) and not list(output.glob("*.tmp"))
    assert (output / "abcdef1234.exe.used").is_file()


async def test_used_installer_marker_survives_a_new_app_instance(installer_api, component):
    _, _, _, output = installer_api
    lua = output / "abcdef1234.lua"
    lua.write_bytes(b"VIP")
    (output / "abcdef1234.exe.used").touch()
    routes = component("app.api.routes")
    errors = component("app.shared.exceptions")
    restarted = FastAPI()
    restarted.include_router(routes.router)
    restarted.add_exception_handler(errors.DomainException, errors.global_exception_handler)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=restarted), base_url="http://test") as client:
        assert (await client.get("/api/v1/files/downloads/vip/abcdef1234.exe")).status_code == 404
        assert lua.exists()


async def test_cancelled_installer_preparation_releases_claim(installer_api, component, monkeypatch):
    app, _, _, output = installer_api
    (output / "abcdef1234.lua").write_bytes(b"VIP")
    service = component("app.application.service")
    monkeypatch.setattr(service.DistributionService, "build_vip_installer", AsyncMock(side_effect=asyncio.CancelledError))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        with pytest.raises(asyncio.CancelledError):
            await client.get("/api/v1/files/downloads/vip/abcdef1234.exe")
    assert not (output / "abcdef1234.exe.used").exists()


@pytest.mark.parametrize("invalid", [None, b"MZ unsupported format", b"MZMTGPAY01\xff\xff\xff\xff"])
async def test_missing_or_invalid_installer_keeps_manual_download_working(installer_api, invalid):
    app, template, _, output = installer_api
    if invalid is None:
        template.unlink()
    else:
        template.write_bytes(invalid)
    lua = output / "abcdef1234.lua"
    lua.write_bytes(b"VIP")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/files/downloads/vip/abcdef1234.exe")
        assert response.status_code == 503
        assert response.json()["error_code"] == "INSTALLER_UNAVAILABLE"
        assert lua.exists()
        assert not (output / "abcdef1234.exe.used").exists()
        assert not list(output.glob("*.exe")) and not list(output.glob("*.tmp"))
        assert (await client.get("/api/v1/files/downloads/vip/abcdef1234")).content == b"VIP"


async def test_cleanup_removes_only_expired_builds(component, monkeypatch, tmp_path):
    worker = component("app.application.worker")
    old = tmp_path / "old.lua"
    fresh = tmp_path / "fresh.lua"
    nested = tmp_path / "vip"
    nested.mkdir()
    template = nested / "template.lua"
    old_exe = tmp_path / "abcdef1234.exe"
    old_tmp = tmp_path / "abcdef1234.deadbeef.tmp"
    fresh_exe = tmp_path / "fresh.exe"
    installer = nested / "template.exe"
    old_marker = tmp_path / "abcdef1234.exe.used"
    fresh_marker = tmp_path / "fresh.exe.used"
    for path in (old_exe, old_tmp, fresh_exe, installer, old_marker, fresh_marker):
        path.write_bytes(b"MZ")
    for path in (old, fresh, template):
        path.write_text("test", encoding="utf-8")
    now = datetime.now(timezone.utc).timestamp()
    os.utime(old, (now-7200, now-7200))
    os.utime(template, (now-7200, now-7200))
    for path in (old_exe, old_tmp, installer, old_marker):
        os.utime(path, (now-7200, now-7200))
    monkeypatch.setattr(worker, "DOWNLOADS_DIR", tmp_path)
    monkeypatch.setattr(worker.asyncio, "sleep", AsyncMock(side_effect=asyncio.CancelledError))
    with pytest.raises(asyncio.CancelledError):
        await worker.cleanup_old_files_task()
    assert not old.exists() and fresh.exists() and template.exists()
    assert not old_exe.exists() and not old_tmp.exists()
    assert fresh_exe.exists() and installer.exists()
    assert not old_marker.exists() and fresh_marker.exists()
