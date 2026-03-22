from sqlalchemy import Column, Integer, String, BigInteger, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from app.shared.database import Base

class UserModel(Base):
    __tablename__ = "identity_users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True)
    discord_id = Column(BigInteger, unique=True, nullable=True)
    nickname = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int):
        return self.db.query(UserModel).filter(UserModel.id == user_id).first()

    def get_by_telegram_id(self, tg_id: int):
        return self.db.query(UserModel).filter(UserModel.telegram_id == tg_id).first()

    def get_by_discord_id(self, ds_id: int):
        return self.db.query(UserModel).filter(UserModel.discord_id == ds_id).first()

    def create(self, nickname: str, telegram_id: int = None, discord_id: int = None):
        new_user = UserModel(nickname=nickname, telegram_id=telegram_id, discord_id=discord_id)
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user

    def update(self, db_user: UserModel, telegram_id: int = None, discord_id: int = None, nickname: str = None):
        if telegram_id: db_user.telegram_id = telegram_id
        if discord_id: db_user.discord_id = discord_id
        if nickname: db_user.nickname = nickname
        self.db.commit()
        self.db.refresh(db_user)
        return db_user