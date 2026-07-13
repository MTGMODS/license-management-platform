import os, re, uuid, aiofiles
from app.domain.schemas import GenerationPayloadDTO

BUILDS_DIR = "app/builds"
BASE_TEMPLATE_PATH = "app/builds/vip/Arizona Helper.lua" 

os.makedirs(BUILDS_DIR, exist_ok=True)

class DistributionService:
    async def build_vip_file(self, payload: GenerationPayloadDTO) -> str:
        if not os.path.exists(BASE_TEMPLATE_PATH):
            raise RuntimeError(f"Base LUA template is missing at {BASE_TEMPLATE_PATH}")

        async with aiofiles.open(BASE_TEMPLATE_PATH, mode='r', encoding='cp1251') as f:
            content = await f.read()

        if payload.expire_date:
            expire = payload.expire_date
            time_bomb = f"if os.time() > os.time{{year={expire.year}, month={expire.month}, day={expire.day}}} then os.remove(thisScript().path) end"

            if " function main" in content:
                content = re.sub(
                    f"function main\(\)", 
                    f"function main() {time_bomb}; ",
                    content
                )
            elif "\nfunction main" in content:
                content += f"\n\n{time_bomb}"

        download_token = uuid.uuid4().hex[:12]
        filepath = os.path.join(BUILDS_DIR, f"{download_token}.lua")
        
        async with aiofiles.open(filepath, mode="w", encoding="cp1251") as f:
            await f.write(content)
            
        print(f"[Build] VIP file ready for User {payload.user_id}. Token: {download_token}")
        
        # return f"https://api.mtgmods.com/api/v1/files/downloads/vip/{download_token}"
        return f"http://localhost:8005/downloads/vip/{download_token}"

    @staticmethod
    def remove_file(path: str):
        if os.path.exists(path):
            os.remove(path)
            print(f"[Cleanup] Removed file: {path}")