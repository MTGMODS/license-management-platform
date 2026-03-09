from sqlalchemy.orm import Session
from ..infrastructure.repository import PurchaseRepository
from ..domain.models import Purchase

class BillingService:
    def __init__(self, db: Session):
        self.repo = PurchaseRepository(db)

    def process_payment(self, user_id: int, amount: float, method: str) -> Purchase:
        db_purchase = self.repo.create(user_id, amount, method)
        return Purchase(
            id=db_purchase.id,
            user_id=db_purchase.user_id,
            amount=db_purchase.amount,
            method=db_purchase.payment_method,
            purchased_at=db_purchase.purchased_at
        )