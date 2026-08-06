import asyncio
from app.shared.database import AsyncSessionLocal
from app.infrastructure.repository import LicenseRepository
from app.infrastructure.messaging import publish_vip_expired_event

async def check_expired_licenses_task():
    while True:
        try:
            async with AsyncSessionLocal() as db:
                repo = LicenseRepository(db)
                expired_licenses = await repo.deactivate_expired_licenses()
                
                if expired_licenses:
                    await db.commit()
                    
                    for lic in expired_licenses:
                        if lic.get("user_id"):
                            await publish_vip_expired_event(lic)
                            
        except Exception as e:
            print(f"[Worker Error] Failed to process expired licenses: {e}")
        
        await asyncio.sleep(600)