from sqlalchemy import Column, Integer, String, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from app.shared.database import Base
from ..domain.models import Subscription, SubscriptionStatus

class SubscriptionModel(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("identity_users.id"), nullable=True)
    key = Column(String, unique=True, index=True, nullable=False)
    duration_days = Column(Integer, nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.NOT_ACTIVATED)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

class ActivationModel(Base):
    __tablename__ = "subscription_activations"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"))
    device = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SubscriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_subscription(self, key: str, duration_days: int, status: SubscriptionStatus) -> SubscriptionModel:
        db_sub = SubscriptionModel(
            key=key,
            duration_days=duration_days,
            status=status
        )
        self.db.add(db_sub)
        self.db.commit()
        self.db.refresh(db_sub)
        return db_sub

    def update_subscription(self, subscription: SubscriptionModel):
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)

    def get_by_key(self, key: str) -> SubscriptionModel:
        return self.db.query(SubscriptionModel).filter(SubscriptionModel.key == key).first()

    def log_activation(self, subscription_id: int, device: str, ip_address: str, user_agent: str):
        activation = self.db.query(ActivationModel).filter(
            ActivationModel.subscription_id == subscription_id,
            ActivationModel.device == device,
            ActivationModel.user_agent == user_agent
        ).first()

        if activation:
            activation.ip_address = ip_address
        else:
            activation = ActivationModel(
                subscription_id=subscription_id,
                device=device,
                ip_address=ip_address,
                user_agent=user_agent
            )
            self.db.add(activation)
        self.db.commit()