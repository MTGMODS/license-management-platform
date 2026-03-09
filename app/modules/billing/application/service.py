from sqlalchemy.orm import Session
from ..infrastructure.repository import PurchaseRepository

class BillingService:
    def __init__(self, db: Session):
        self.repo = PurchaseRepository(db)

    def process_payment(self, user_id: int, amount: float, method: str):

        return self.repo.create(user_id, amount, method)