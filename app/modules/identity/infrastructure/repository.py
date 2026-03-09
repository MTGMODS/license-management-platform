from sqlalchemy import Column, Integer, String, BigInteger
from sqlalchemy.orm import Session
from app.shared.database import Base

class UserModel(Base):
    __tablename__ = "identity_users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True)
    discord_id = Column(BigInteger, unique=True, nullable=True)
    nickname = Column(String, nullable=False)

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_telegram_id(self, tg_id: int):
        return self.db.query(UserModel).filter(UserModel.telegram_id == tg_id).first()

    def create(self, telegram_id: int, nickname: str):
        new_user = UserModel(telegram_id=telegram_id, nickname=nickname)
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user