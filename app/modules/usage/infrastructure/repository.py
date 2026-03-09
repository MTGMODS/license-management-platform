from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.shared.database import Base

class LaunchModel(Base):
    __tablename__ = "usage_launches"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, nullable=False)
    device = Column(String, nullable=False)
    server_id = Column(String, nullable=True)
    country = Column(String, nullable=True)
    launched_at = Column(DateTime(timezone=True), server_default=func.now())

class LaunchRepository:
    def __init__(self, db: Session):
        self.db = db

    def save(self, version: str, device: str, server_id: str, country: str):
        new_launch = LaunchModel(version=version, device=device, server_id=server_id, country=country)
        self.db.add(new_launch)
        self.db.commit()
        self.db.refresh(new_launch)
        return new_launch