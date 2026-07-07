import os
import aiofiles
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.schemas import GenerationPayloadDTO
from app.infrastructure.repository import FileGeneratorRepository

BUILDS_DIR = "builds"
BASE_TEMPLATE_PATH = "app/assets/base_helper.lua" 

os.makedirs(BUILDS_DIR, exist_ok=True)

class FileGeneratorService:
    def __init__(self, db: AsyncSession):
        self.repo = FileGeneratorRepository(db)

    async def build_lua_file(self, payload: GenerationPayloadDTO) -> str:
        if not os.path.exists(BASE_TEMPLATE_PATH):
            raise RuntimeError(f"Base LUA template is missing at {BASE_TEMPLATE_PATH}")

        try:
            db_log = await self.repo.log_generation(key=payload.key, user_id=payload.user_id, filename=BASE_TEMPLATE_PATH)
            print(f"[Build] Success for User {payload.user_id}. DB Log ID: {db_log.id}")
        except Exception as e:
            print(f"[Build] Failed to save log in DB: {e}")
        
        return f"http://localhost:8005/downloads/{BASE_TEMPLATE_PATH}"

    @staticmethod
    def remove_file(path: str):
        if os.path.exists(path):
            os.remove(path)
            print(f"[Cleanup] Removed file: {path}")