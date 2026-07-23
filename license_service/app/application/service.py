import secrets
import string
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.domain.models import LicenseStatus, License
from app.domain.schemas import GeneratePurchaseDTO
from app.infrastructure.repository import LicenseRepository, TransactionRepository, TransactionModel, LicenseModel
from app.shared.exceptions import DomainException

class LicenseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.license_repo = LicenseRepository(db)
        self.tx_repo = TransactionRepository(db)

    async def check_access(self, key: str, device: str, ip_address: str, user_agent: str) -> dict:
        db_sub = await self.license_repo.get_by_key(key)
        if not db_sub:
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")
        
        domain_sub = License(
            id=db_sub.id, key=db_sub.key, duration_days=db_sub.duration_days,
            status=db_sub.status, activated_at=db_sub.activated_at, expires_at=db_sub.expires_at
        )
        
        if not domain_sub.is_valid():
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")

        existing_devices = [d.device for d in db_sub.devices]
        if device not in existing_devices:
            if len(existing_devices) >= db_sub.max_devices: 
                raise DomainException(
                    message=f"Device limit reached (Max {db_sub.max_devices}). Reset HWID in profile.", 
                    status_code=403, error_code="HWID_LIMIT_REACHED"
                )

        await self.license_repo.log_device(db_sub.id, device, ip_address, user_agent)
        return {"user_id": db_sub.user_id, "expires_at": db_sub.expires_at.isoformat() if db_sub.expires_at else None}
    

    async def get_user_devices(self, user_id: int) -> dict:
        db_sub = await self.license_repo.get_active_by_user(user_id)
        if not db_sub:
            raise DomainException(message="No active license found.", status_code=404, error_code="NOT_FOUND")
            
        devices = []
        for d in db_sub.devices:
            hwid_masked = f"{d.device[:3]}******{d.device[-3:]}" if len(d.device) > 6 else "***"
            ip_masked = "Unknown"
            if d.ip_address:
                parts = d.ip_address.split('.')
                ip_masked = f"{parts[0]}.{parts[1]}.*.*" if len(parts) == 4 else "***"

            devices.append({
                "id": d.id,
                "hwid": hwid_masked,
                "ip": ip_masked,
                "last_used_at": d.last_used_at.isoformat() if d.last_used_at else None
            })
            
        return {
            "license_key": db_sub.key,
            "max_devices": db_sub.max_devices,
            "resets_used": db_sub.resets_used,
            "devices": devices
        }

    async def reset_device(self, user_id: int, device_id: int):
        db_sub = await self.license_repo.get_active_by_user(user_id)
        if not db_sub:
            raise DomainException(message="No active license found.", status_code=404, error_code="NOT_FOUND")
            
        if db_sub.resets_used >= 1: 
            raise DomainException(message="You have already used your 1 allowed device reset.", status_code=403, error_code="RESET_LIMIT_REACHED")
            
        target_device = next((d for d in db_sub.devices if d.id == device_id), None)
        if not target_device:
            raise DomainException(message="Device not found on your license.", status_code=404, error_code="NOT_FOUND")
            
        await self.license_repo.remove_device(device_id)
        db_sub.resets_used += 1
        await self.db.commit()
    
    def _make_key(self, n=16) -> str:
        raw = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(n))
        return '-'.join(raw[i:i+4] for i in range(0, n, 4))

    async def generate_and_bill(self, payload: GeneratePurchaseDTO) -> dict:
        new_key = self._make_key()
        
        db_sub = LicenseModel(
            key=new_key, 
            duration_days=payload.duration_days, 
            status=LicenseStatus.NOT_ACTIVATED,
            max_devices=payload.max_devices
        )
        self.db.add(db_sub)
        await self.db.flush() 

        tx = TransactionModel(
            user_id=payload.user_id, 
            license_id=db_sub.id, 
            amount=payload.amount, 
            payment_method=payload.method, 
            status=payload.status
        )
        self.db.add(tx)
        
        await self.db.commit()
        
        return {"key": new_key, "transaction_id": tx.id}

    async def activate_key_for_user(self, key: str, user_id: int) -> int:
        db_sub = await self.license_repo.get_by_key(key)
        if not db_sub or db_sub.status != LicenseStatus.NOT_ACTIVATED:
            raise DomainException(message="Invalid key or already activated", status_code=400, error_code="INVALID_KEY")
        
        expires_at = None
        if db_sub.duration_days is not None:
            expires_at = datetime.now(timezone.utc) + timedelta(days=db_sub.duration_days)
        
        db_sub.user_id = user_id
        db_sub.status = LicenseStatus.ACTIVE
        db_sub.activated_at = datetime.now(timezone.utc)
        db_sub.expires_at = expires_at
        
        await self.db.commit()
        return db_sub.id

    async def complete_pending_purchase(self, license_id: int, user_id: int):
        result = await self.db.execute(
            select(TransactionModel).filter(TransactionModel.license_id == license_id, TransactionModel.status == "PENDING")
        )
        tx = result.scalars().first()

        if tx:
            tx.status = "COMPLETED"
            tx.user_id = user_id
            tx.purchased_at = datetime.now(timezone.utc)
            await self.db.commit()

    async def get_active_license_for_download(self, user_id: int) -> LicenseModel:
        db_sub = await self.license_repo.get_active_by_user(user_id)
        if not db_sub:
            raise DomainException(message="You don't have an active license.", status_code=403, error_code="NO_ACTIVE_LICENSE")
            
        return db_sub

    async def get_all_licenses_admin(self, limit: int, offset: int):
        return await self.license_repo.get_all_licenses(limit, offset)

    async def update_license_status_admin(self, license_id: int, new_status: LicenseStatus):
        lic = await self.license_repo.get_by_id(license_id)
        if not lic:
            raise DomainException(message="License not found.", status_code=404, error_code="NOT_FOUND")
        
        lic.status = new_status
        await self.db.commit()
        return lic

    async def remove_device_admin(self, device_id: int):
        deleted = await self.license_repo.remove_device(device_id)
        
        if not deleted:
            raise DomainException(
                message=f"Device with ID {device_id} not found.", 
                status_code=404, 
                error_code="NOT_FOUND"
            )
            
        return {"status": "success"}
