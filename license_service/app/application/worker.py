import asyncio
from app.shared.database import AsyncSessionLocal
from app.infrastructure.repository import LicenseRepository
from app.infrastructure.messaging import publish_bot_command
from app.infrastructure.external_clients import UserServiceClient

async def check_expired_licenses_task():
    user_client = UserServiceClient()
    
    while True:
        try:
            async with AsyncSessionLocal() as db:
                repo = LicenseRepository(db)
                expired_licenses = await repo.deactivate_expired_licenses()
                
                if expired_licenses:
                    await db.commit()
                    
                    for lic in expired_licenses:
                        user_id = lic.get("user_id")
                        if not user_id:
                            continue
                            
                        socials = await user_client.get_social_ids_by_user_id(user_id)
                        if not socials: 
                            continue
                            
                        tg_id = socials.get("telegram_id")
                        ds_id = socials.get("discord_id")
                        
                        msg = "😔 Your VIP has ended"

                        if ds_id:
                            await publish_bot_command(routing_key="discord.remove_vip_role", payload={"discord_id": ds_id, "reason": "vip_expired"})
                            await publish_bot_command(routing_key="discord.send_message", payload={"discord_id": ds_id, "text": msg})

                        if tg_id:
                            await publish_bot_command(routing_key="telegram.kick_from_vip_chat", payload={"telegram_id": tg_id, "reason": "vip_expired"})
                            await publish_bot_command(routing_key="telegram.send_message", payload={"telegram_id": tg_id, "text": msg})
                            
        except Exception as e:
            print(f"[Worker Error] Failed to process expired licenses: {e}")
        
        await asyncio.sleep(600)