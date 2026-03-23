import asyncio
from fastapi import FastAPI, Header
from pydantic import BaseModel
from app.shared.exceptions import DomainException, global_exception_handler

app = FastAPI(title="MTG File Generator Service", port=8005)
app.add_exception_handler(DomainException, global_exception_handler)

class BuildRequest(BaseModel):
    key: str
    user_id: int

@app.post("/api/v1/generator/build")
async def build_mod(payload: BuildRequest, x_correlation_id: str = Header(None)):
    print(f"[Trace: {x_correlation_id}] Початок генерації файлу для ключа: {payload.key}")
    
    # Імітація важкої роботи (збірка файлу)
    await asyncio.sleep(1.0) 
    
    # Імітація згенерованого коду
    obfuscated_code = f"-- MTG VIP MOD --\n-- USER: {payload.user_id} --\n-- KEY: {payload.key} --\nprint('VIP Activated')"
    
    print(f"[Trace: {x_correlation_id}] Файл успішно згенеровано.")
    return {"status": "success", "file_content": obfuscated_code, "filename": f"mtg_vip_{payload.user_id}.lua"}