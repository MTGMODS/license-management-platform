from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.shared.database import Base

class GeneratedFileModel(Base):
    __tablename__ = "generator_logs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, index=True, nullable=False)
    user_id = Column(Integer, index=True, nullable=False)
    filename = Column(String, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())