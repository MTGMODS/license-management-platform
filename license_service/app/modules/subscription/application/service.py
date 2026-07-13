from sqlalchemy.orm import Session
from ..infrastructure.repository import SubscriptionRepository, OutboxEventModel
from ..domain.models import Subscription, SubscriptionStatus
from app.shared.exceptions import DomainException
import secrets, json, string, uuid
from datetime import datetime, timezone, timedelta

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

        return db_sub.user_id
    
    def _make_key(self, n=16) -> str:
        raw = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(n))
        return '-'.join(raw[i:i+4] for i in range(0, n, 4))
    
    def generate_unactivated_key(self, duration: int) -> str:
        for _ in range(5):
            new_key = self._make_key()
            existing_key = self.repo.get_by_key(new_key)
            if not existing_key:
                self.repo.create_subscription(
                    key=new_key, 
                    duration_days=duration,
                    status=SubscriptionStatus.NOT_ACTIVATED
                )
                return new_key
            
        raise DomainException(message="Failed to generate unique key.", status_code=500, error_code="KEY_GENERATION_FAILED")

    def activate_key_for_user(self, key: str, user_id: int) -> bool:
        db_sub = self.repo.get_by_key(key)
        if not db_sub or db_sub.status != SubscriptionStatus.NOT_ACTIVATED:
            return None
        
        expires_at = None
        if db_sub.duration_days is not None:
            expires_at = datetime.now(timezone.utc) + timedelta(days=db_sub.duration_days)
        
        db_sub.user_id = user_id
        db_sub.status = SubscriptionStatus.ACTIVE
        db_sub.activated_at = datetime.now(timezone.utc)
        db_sub.expires_at = expires_at
        
        self.repo.db.commit()

        return db_sub.id
    
    def validate_for_download(self, key: str, user_id: int) -> bool:
        db_sub = self.repo.get_by_key(key)
        if not db_sub or db_sub.user_id != user_id:
            return False

        domain_sub = Subscription(
            id=db_sub.id,
            key=db_sub.key,
            duration_days=db_sub.duration_days,
            status=db_sub.status,
            expires_at=db_sub.expires_at
        )
        return domain_sub.is_valid()
    
    def request_download(self, key: str, user_id: int):
        db_sub = self.repo.get_by_key(key)
        
        if not db_sub:
            raise DomainException(message="Subscription not found", status_code=404, error_code="SUB_NOT_FOUND")
            
        if db_sub.user_id != user_id:
            raise DomainException(message="Access denied", status_code=403, error_code="ACCESS_DENIED")
            
        if db_sub.status != SubscriptionStatus.ACTIVE:
             raise DomainException(message="Subscription is not active", status_code=403, error_code="SUB_NOT_ACTIVE")

        trace_id = f"req-{uuid.uuid4().hex[:8]}"

        event_payload = json.dumps({
            "user_id": user_id, 
            "key": key,
            "correlation_id": trace_id
        })
        
        self.repo.create_outbox_event("FileGenerationRequested", event_payload)
        
        self.repo.db.commit()

        return {
            "status": "processing", 
            "message": "Запит прийнято! Збірка генерується асинхронно. Очікуйте.",
            "trace_id": trace_id
        }