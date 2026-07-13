import secrets
import string
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.domain.models import LicenseStatus, License
from app.infrastructure.repository import LicenseRepository, TransactionRepository, TransactionModel
from app.shared.exceptions import DomainException

class LicenseService:
    def __init__(self, db: Session):
        self.db = db
        self.license_repo = LicenseRepository(db)
        self.tx_repo = TransactionRepository(db)

    def check_access(self, key: str, device: str, ip_address: str, user_agent: str) -> dict:
        db_sub = self.license_repo.get_by_key(key)
        if not db_sub:
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")
        
        domain_sub = License(
            id=db_sub.id,
            key=db_sub.key,
            duration_days=db_sub.duration_days,
            status=db_sub.status,
            activated_at=db_sub.activated_at,
            expires_at=db_sub.expires_at
        )
        
        if not domain_sub.is_valid():
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")

        existing_devices = [d.device for d in db_sub.devices]
        if device not in existing_devices:
            if len(existing_devices) >= 3:
                raise DomainException(
                    message="Device limit reached (Max 3). Reset HWID in profile.", 
                    status_code=403, 
                    error_code="HWID_LIMIT_REACHED"
                )

        self.license_repo.log_device(db_sub.id, device, ip_address, user_agent)
        
        return {
            "user_id": db_sub.user_id, 
            "expires_at": db_sub.expires_at.isoformat() if db_sub.expires_at else None
        }
    
    def _make_key(self, n=16) -> str:
        raw = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(n))
        return '-'.join(raw[i:i+4] for i in range(0, n, 4))

    def generate_unactivated_key(self, duration_days: int) -> str:
        for _ in range(5):
            new_key = _make_key(16)
            
            if not self.license_repo.get_by_key(new_key):
                self.license_repo.create_license(
                    key=new_key, 
                    duration_days=duration_days,
                    status=LicenseStatus.NOT_ACTIVATED
                )
                return new_key
                
        raise DomainException(message="Failed to generate unique key.", status_code=500)

    def activate_key_for_user(self, key: str, user_id: int) -> int:
        db_sub = self.license_repo.get_by_key(key)
        if not db_sub or db_sub.status != LicenseStatus.NOT_ACTIVATED:
            raise DomainException(message="Invalid key or already activated", status_code=400, error_code="INVALID_KEY")
        
        expires_at = None
        if db_sub.duration_days is not None:
            expires_at = datetime.now(timezone.utc) + timedelta(days=db_sub.duration_days)
        
        db_sub.user_id = user_id
        db_sub.status = LicenseStatus.ACTIVE
        db_sub.activated_at = datetime.now(timezone.utc)
        db_sub.expires_at = expires_at
        
        self.db.commit()
        return db_sub.id

    def complete_pending_purchase(self, license_id: int, user_id: int):
        tx = self.db.query(TransactionModel).filter(
            TransactionModel.license_id == license_id,
            TransactionModel.status == "PENDING"
        ).first()

        if tx:
            tx.status = "COMPLETED"
            tx.user_id = user_id
            tx.purchased_at = datetime.now(timezone.utc)
            self.db.commit()

    def validate_for_download(self, key: str, user_id: int) -> License:
        db_sub = self.license_repo.get_by_key(key)
        
        if not db_sub:
            raise DomainException(message="License not found", status_code=404, error_code="SUB_NOT_FOUND")
        if db_sub.user_id != user_id:
            raise DomainException(message="Access denied", status_code=403, error_code="ACCESS_DENIED")
            
        domain_sub = License(
            id=db_sub.id,
            key=db_sub.key,
            duration_days=db_sub.duration_days,
            status=db_sub.status,
            activated_at=db_sub.activated_at,
            expires_at=db_sub.expires_at
        )
        
        if not domain_sub.is_valid():
            raise DomainException(message="License is expired or banned", status_code=403, error_code="SUB_NOT_ACTIVE")
            
        return domain_sub