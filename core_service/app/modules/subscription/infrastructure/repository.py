from sqlalchemy import Column, Integer, String, Enum as SQLEnum, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from app.shared.database import Base
from ..domain.models import Subscription, SubscriptionStatus

class SubscriptionModel(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("identity_users.id"), nullable=True)
    key = Column(String, unique=True, index=True, nullable=False)
    duration_days = Column(Integer, nullable=True)
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.NOT_ACTIVATED)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

class ActivationModel(Base):
    __tablename__ = "subscription_activations"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"))
    device = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class OutboxEventModel(Base):
    __tablename__ = "outbox_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False)
    payload = Column(Text, nullable=False)
    status = Column(String, default="PENDING") # or PROCESSED
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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

    def create_outbox_event(self, event_type: str, payload: str, commit: bool = False):
        """
        Створює запис у таблиці Outbox.
        commit=False дозволяє зберегти подію в рамках поточної транзакції.
        """
        outbox_event = OutboxEventModel(
            event_type=event_type,
            payload=payload,
            status="PENDING"
        )
        self.db.add(outbox_event)
        
        if commit:
            self.db.commit()
            
        return outbox_event