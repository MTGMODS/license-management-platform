from sqlalchemy import Column, Integer, String, Enum as SQLEnum, DateTime
from sqlalchemy.orm import Session
from app.shared.database import Base
from ..domain.models import Subscription, SubscriptionStatus

class SubscriptionModel(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    duration_days = Column(Integer, nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.NOT_ACTIVATED)
    activated_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

class SubscriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_key(self, key: str) -> SubscriptionModel:
        return self.db.query(SubscriptionModel).filter(SubscriptionModel.key == key).first()