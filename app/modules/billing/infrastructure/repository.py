from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from app.shared.database import Base

class PurchaseModel(Base):
    __tablename__ = "billing_purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("identity_users.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), unique=True, nullable=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())

class PurchaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, amount: float, method: str):
        purchase = PurchaseModel(user_id=user_id, amount=amount, payment_method=method)
        self.db.add(purchase)
        self.db.commit()
        self.db.refresh(purchase)
        return purchase