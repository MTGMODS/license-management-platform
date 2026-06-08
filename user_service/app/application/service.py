from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.repository import UserRepository
from app.domain.models import User
from app.shared.exceptions import DomainException

class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def get_user_by_id(self, user_id: int) -> User | None:
        db_user = await self.repo.get_by_id(user_id)
        return User.model_validate(db_user) if db_user else None

    async def authenticate(self, telegram_id: int = None, discord_id: int = None) -> User:
        db_user = await self.repo.get_by_telegram_id(telegram_id) if telegram_id else await self.repo.get_by_discord_id(discord_id)

        if db_user:
            if db_user.is_banned:
                raise DomainException("This account is banned.", status_code=403, error_code="USER_BANNED")
        else:
            temp_nickname = str(telegram_id or discord_id)
            db_user = await self.repo.create(
                nickname=temp_nickname, 
                telegram_id=telegram_id, 
                discord_id=discord_id
            )

        return User.model_validate(db_user)

    async def link_social(self, user_id: int, telegram_id: int = None, discord_id: int = None) -> User:
        db_user = await self.repo.get_by_id(user_id)
        if not db_user:
            raise DomainException("User not found.", status_code=404, error_code="USER_NOT_FOUND")

        existing = await self.repo.get_by_telegram_id(telegram_id) if telegram_id else await self.repo.get_by_discord_id(discord_id)
        if existing and existing.id != user_id:
            raise DomainException("This social ID is already linked to another profile.", status_code=409, error_code="ALREADY_LINKED")

        if telegram_id: db_user.telegram_id = telegram_id
        if discord_id: db_user.discord_id = discord_id
        
        db_user = await self.repo.update(db_user)
        return User.model_validate(db_user)

    async def sync_profile(self, nickname: str, avatar_url: str = None, telegram_id: int = None, discord_id: int = None):
        db_user = await self.repo.get_by_telegram_id(telegram_id) if telegram_id else await self.repo.get_by_discord_id(discord_id)
        
        if db_user:
            db_user.nickname = nickname
            db_user.avatar_url = avatar_url
            await self.repo.update(db_user)
        else:
            raise DomainException("User not found.", status_code=404, error_code="USER_NOT_FOUND")