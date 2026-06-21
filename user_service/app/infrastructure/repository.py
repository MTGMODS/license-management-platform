from sqlalchemy import Column, Integer, String, cast, BigInteger, DateTime, select, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import Base
from app.domain.models import UserStatus

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=True)
    discord_id = Column(BigInteger, unique=True, index=True, nullable=True)
    nickname = Column(String(50), nullable=False, index=True)
    avatar_url = Column(String, nullable=True)
    role = Column(String(20), default="USER", nullable=False)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> UserModel | None:
        result = await self.db.execute(select(UserModel).where(UserModel.id == user_id))
        return result.scalars().first()

    async def get_by_telegram_id(self, tg_id: int) -> UserModel | None:
        result = await self.db.execute(select(UserModel).where(UserModel.telegram_id == tg_id))
        return result.scalars().first()

    async def get_by_discord_id(self, ds_id: int) -> UserModel | None:
        result = await self.db.execute(select(UserModel).where(UserModel.discord_id == ds_id))
        return result.scalars().first()
    
    async def search_users(self, nickname: str = None, telegram_id: str = None, discord_id: str = None) -> list[UserModel]:
        stmt = select(UserModel)
    
        if nickname:
            stmt = stmt.where(UserModel.nickname.ilike(f"%{nickname}%"))
            
        if telegram_id:
            stmt = stmt.where(cast(UserModel.telegram_id, String).ilike(f"%{telegram_id}%"))
            
        if discord_id:
            stmt = stmt.where(cast(UserModel.discord_id, String).ilike(f"%{discord_id}%"))
            
        stmt = stmt.limit(10)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create(self, nickname: str, telegram_id: int = None, discord_id: int = None, avatar_url: str = None) -> UserModel:
        new_user = UserModel(
            nickname=nickname, 
            telegram_id=telegram_id, 
            discord_id=discord_id,
            avatar_url=avatar_url
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        return new_user

    async def update(self, user: UserModel) -> UserModel:
        await self.db.commit()
        await self.db.refresh(user)
        return user