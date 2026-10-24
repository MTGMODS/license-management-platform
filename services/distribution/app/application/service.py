import json
import os, re, aiofiles
import struct
from pathlib import Path
from uuid import uuid4
from app.shared.config import settings
from app.domain.schemas import GenerationPayloadDTO

BUILDS_DIR = "app/builds"
BASE_TEMPLATE_PATH = "app/builds/vip/Arizona Helper.lua" 
INSTALLER_TEMPLATE_PATH = "app/builds/installer/Arizona&Rodina Helper.exe"

os.makedirs(BUILDS_DIR, exist_ok=True)

class DistributionService:
    async def build_vip_installer(self, token: str) -> str:
        """Replace the installer's MTGPAY01 URL overlay; never modify the template."""
        async with aiofiles.open(INSTALLER_TEMPLATE_PATH, "rb") as source:
            template = await source.read()
        magic = b"MTGPAY01"
        if not template.startswith(b"MZ") or template[-12:-4] != magic:
            raise ValueError("Unsupported installer template: MTGPAY01 overlay required")
        length = struct.unpack("<I", template[-4:])[0]
        if length == 0 or length > len(template) - 14:
            raise ValueError("Invalid installer overlay length")

        payload = json.dumps({
            "name": "Arizona&Rodina Helper",
            "filename": "Arizona Helper.lua",
            "url": f"{settings.DOWNLOAD_BASE_URL.rstrip('/')}/{token}",
        }, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        xor_key = bytes.fromhex("5a19c37ea144d80b6f9231e45827bc0d")
        cipher = bytes(byte ^ xor_key[index % len(xor_key)] for index, byte in enumerate(payload))
        # One private response file per request; parallel downloads keep the same
        # public <token>.exe URL without overwriting/deleting each other's EXE.
        output = Path(BUILDS_DIR) / f"{token}.{uuid4().hex}.exe"
        temporary = output.with_suffix(".tmp")
        try:
            async with aiofiles.open(temporary, "wb") as target:
                await target.write(template[:-12-length])
                await target.write(cipher + magic + struct.pack("<I", len(cipher)))
            os.replace(temporary, output)
        finally:
            temporary.unlink(missing_ok=True)
        return str(output)

    async def build_vip_file(self, payload: GenerationPayloadDTO, correlation_id: str) -> str:
        if not os.path.exists(BASE_TEMPLATE_PATH):
            raise RuntimeError(f"Base LUA template is missing at {BASE_TEMPLATE_PATH}")

        async with aiofiles.open(BASE_TEMPLATE_PATH, mode='r', encoding='cp1251') as f:
            content = await f.read()

        if payload.expire_date:
            expire = payload.expire_date
            time_bomb = f"if os.time() > os.time{{year={expire.year}, month={expire.month}, day={expire.day}, hour={expire.hour}, min={expire.minute}}} then os.remove(thisScript().path) end"

            if "\nfunction main" in content:
                content += f"\n\n{time_bomb}"
            elif "function main" in content:
                content = re.sub(
                    r"(function\s+main\s*\(\s*(?:\.\.\.)?\s*\))",
                    rf"\1 {time_bomb}; ",
                    content
                )

        file_token = correlation_id.replace("-", "")[:10]
        filepath = os.path.join(BUILDS_DIR, f"{file_token}.lua")
        
        async with aiofiles.open(filepath, mode="w", encoding="cp1251") as f:
            await f.write(content)
            
        print(f"[Build] VIP file ready for User {payload.user_id}. Token: {file_token}")

        base = settings.DOWNLOAD_BASE_URL.rstrip("/")
        return f"{base}/{file_token}"

    @staticmethod
    def remove_file(path: str):
        if os.path.exists(path):
            os.remove(path)
            print(f"[Cleanup] Removed file: {path}")
