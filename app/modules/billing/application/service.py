from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ..infrastructure.repository import PurchaseRepository, PurchaseModel
from ..domain.models import Purchase

class BillingService:
    def __init__(self, db: Session):
        self.repo = PurchaseRepository(db)
    
    def create_purchase(self, amount: float, method: str, user_id: int = None, subscription_id: int = None, status: str = "COMPLETED") -> Purchase:
        db_purchase = self.repo.create(amount, method, user_id, subscription_id, status)
        return Purchase(
            id=db_purchase.id,
            user_id=db_purchase.user_id,
            amount=db_purchase.amount,
            method=db_purchase.payment_method,
            purchased_at=db_purchase.purchased_at
        )
    
    def complete_pending_purchase(self, subscription_id: int, user_id: int):
        """Шукає відкладений чек для ключа і закриває його на конкретного юзера"""
        purchase = self.db.query(PurchaseModel).filter(
            PurchaseModel.subscription_id == subscription_id,
            PurchaseModel.status == "PENDING"
        ).first()

        if purchase:
            purchase.status = "COMPLETED"
            purchase.user_id = user_id
            purchase.purchased_at = datetime.now(timezone.utc)
            self.db.commit()