import secrets
import string
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.domain.models import LicenseStatus, License
from app.infrastructure.repository import LicenseRepository, TransactionRepository, TransactionModel
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
                    message=f"Device limit reached (Max {db_sub.max_devices} for you)",
                    status_code=403, error_code="DEVICE_LIMIT_REACHED"
                )

        await self.license_repo.log_device(db_sub.id, device, ip_address, user_agent)
        
        return {"user_id": db_sub.user_id, "expires_at": db_sub.expires_at.isoformat() if db_sub.expires_at else None}
    
    def _make_key(self, n=16) -> str:
        raw = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(n))
        return '-'.join(raw[i:i+4] for i in range(0, n, 4))

    async def generate_unactivated_key(self, duration_days: int) -> str:
        for _ in range(5):
            new_key = self._make_key()
            if not await self.license_repo.get_by_key(new_key):
                await self.license_repo.create_license(
                    key=new_key, duration_days=duration_days, status=LicenseStatus.NOT_ACTIVATED
                )
                return new_key
                
        raise DomainException(message="Failed to generate unique key.", status_code=500)

    async def generate_and_bill(self, payload: GeneratePurchaseDTO) -> dict:
        new_key = self._make_key()
        
        # 1. Створюємо ліцензію
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

    async def validate_for_download(self, key: str, user_id: int) -> License:
        db_sub = await self.license_repo.get_by_key(key)
        if not db_sub:
            raise DomainException(message="License not found", status_code=404, error_code="NOT_FOUND")
        if db_sub.user_id != user_id:
            raise DomainException(message="Access denied", status_code=403, error_code="ACCESS_DENIED")
            
        domain_sub = License(
            id=db_sub.id, key=db_sub.key, duration_days=db_sub.duration_days,
            status=db_sub.status, activated_at=db_sub.activated_at, expires_at=db_sub.expires_at
        )
        
        if not domain_sub.is_valid():
            raise DomainException(message="License is expired or banned", status_code=403, error_code="NOT_ACTIVE")
            
        return domain_sub