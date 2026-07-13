from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import Base

class GeneratedFileModel(Base):
    __tablename__ = "generator_logs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, index=True, nullable=False)
    user_id = Column(Integer, index=True, nullable=False)
    filename = Column(String, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

class FileGeneratorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_generation(self, key: str, user_id: int, filename: str) -> GeneratedFileModel:
        db_log = GeneratedFileModel(
            key=key,
            user_id=user_id,
            filename=filename
        )
        self.db.add(db_log)
        await self.db.commit()
        await self.db.refresh(db_log)
        return db_log