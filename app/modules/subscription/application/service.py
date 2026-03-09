from sqlalchemy.orm import Session
from ..infrastructure.repository import SubscriptionRepository
from ..domain.models import Subscription

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