import asyncio
from fastapi import FastAPI, Header, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.shared.database import engine, Base, get_db
from app.shared.exceptions import DomainException, global_exception_handler
from app.models import GeneratedFileModel

Base.metadata.create_all(bind=engine)

app = FastAPI(title="File Generator Service", port=8005)
app.add_exception_handler(DomainException, global_exception_handler)

class BuildRequest(BaseModel):
    key: str
    user_id: int

@app.post("/api/v1/generator/build")
async def build_mod(
    payload: BuildRequest, 
    x_correlation_id: str = Header(None),
    db: Session = Depends(get_db)
):
    print(f"[Trace: {x_correlation_id}] Початок генерації файлу для ключа: {payload.key}")
    
    # Імітація важкої роботи (збірка файлу)
    await asyncio.sleep(1.0) 
    
    # Імітація генерації унікального файлу
    filename = f"mtg_vip_{payload.user_id}.lua"
    obfuscated_code = f"-- MTG VIP MOD --\n-- USER: {payload.user_id} --\n-- KEY: {payload.key} --\nprint('VIP Activated')"
    
    db_log = GeneratedFileModel(
        key=payload.key,
        user_id=payload.user_id,
        filename=filename
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    print(f"[Trace: {x_correlation_id}] Файл згенеровано та збережено в БД (ID логу: {db_log.id}).")
    return {"status": "success", "file_content": obfuscated_code, "filename": filename}