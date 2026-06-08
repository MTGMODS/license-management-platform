from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from app.infrastructure.repository import UserRepository
from app.domain.models import User
from app.shared.exceptions import DomainException

class AuthService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def login_with_telegram(self, telegram_id: int, nickname: str = None, avatar_url: str = None) -> User:
        db_user = await self.repo.get_by_telegram_id(telegram_id)
        return await self._process_login(db_user, telegram_id=telegram_id, nickname=nickname, avatar_url=avatar_url)

    async def login_with_discord(self, discord_id: int, nickname: str = None, avatar_url: str = None) -> User:
        db_user = await self.repo.get_by_discord_id(discord_id)
        return await self._process_login(db_user, discord_id=discord_id, nickname=nickname, avatar_url=avatar_url)

    async def _process_login(self, db_user, telegram_id: int = None, discord_id: int = None, nickname: str = None, avatar_url: str = None) -> User:
        if db_user:
            if db_user.is_banned:
                raise DomainException("This account is banned.", status_code=403, error_code="USER_BANNED")
            
            if nickname: db_user.nickname = nickname
            if avatar_url: db_user.avatar_url = avatar_url
            
            db_user.last_login_at = func.now() 
            db_user = await self.repo.update(db_user)
        else:
            db_user = await self.repo.create(
                nickname=nickname,
                telegram_id=telegram_id,
                discord_id=discord_id,
                avatar_url=avatar_url
            )
        return User.model_validate(db_user)