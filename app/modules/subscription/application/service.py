from sqlalchemy.orm import Session
from ..infrastructure.repository import SubscriptionRepository
from ..domain.models import Subscription
import uuid
from datetime import datetime, timedelta

class SubscriptionService:
    def __init__(self, db: Session):
        self.repo = SubscriptionRepository(db)

    def check_access(self, key: str, device: str, ip_address: str, user_agent: str) -> bool:
        db_sub = self.repo.get_by_key(key)
        if not db_sub:
            return False
        
        domain_sub = Subscription(
            id=db_sub.id,
            key=db_sub.key,
            duration_days=db_sub.duration_days,
            status=db_sub.status,
            expires_at=db_sub.expires_at
        )
        
        is_valid = domain_sub.is_valid()
        
        if is_valid:
            self.repo.log_activation(db_sub.id, device, ip_address, user_agent)

        return is_valid
    
    def generate_unactivated_key(self, duration: int) -> str:
        new_key = str(uuid.uuid4()).upper()[:14]
        self.repo.create_subscription(
            key=new_key, 
            duration_days=duration,
            status="WAIT_ACTIVATE"
        )
        return new_key

    def activate_key_for_user(self, key: str, user_id: int) -> bool:
        db_sub = self.repo.get_by_key(key)
        if not db_sub or db_sub.status != "WAIT_ACTIVATE":
            return False
        
        expires_at = None
        if db_sub.duration_days > 0:
            expires_at = datetime.now() + timedelta(days=db_sub.duration_days)
        
        db_sub.user_id = user_id
        db_sub.status = "ACTIVE"
        db_sub.activated_at = datetime.utcnow()
        db_sub.expires_at = expires_at
        
        self.repo.db.commit()
        return True