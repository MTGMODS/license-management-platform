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

    async def link_social(self, user_id: int, telegram_id: int = None, discord_id: int = None) -> User:
        db_user = await self.repo.get_by_id(user_id)
        if not db_user:
            raise DomainException("User not found.", status_code=404, error_code="USER_NOT_FOUND")
        
        if db_user.telegram_id is not None and db_user.discord_id is not None:
            raise DomainException(
                "This account already has both Telegram and Discord linked.", 
                status_code=400, 
                error_code="ALL_SOCIALS_ALREADY_LINKED"
            )
        
        if telegram_id and db_user.telegram_id is not None:
            raise DomainException(
                "Telegram is already linked to this account. You cannot change it.", 
                status_code=400, 
                error_code="CANNOT_OVERWRITE_TELEGRAM"
            )
        
        if discord_id and db_user.discord_id is not None:
            raise DomainException(
                "Discord is already linked to this account. You cannot change it.", 
                status_code=400, 
                error_code="CANNOT_OVERWRITE_DISCORD"
            )
        
        existing = await self.repo.get_by_telegram_id(telegram_id) if telegram_id else await self.repo.get_by_discord_id(discord_id)
        if existing and existing.id != user_id:
            raise DomainException(
                "This social account is already linked to another profile.", 
                status_code=409, 
                error_code="ALREADY_LINKED"
            )

        if telegram_id: 
            db_user.telegram_id = telegram_id
        if discord_id: 
            db_user.discord_id = discord_id
        
        db_user = await self.repo.update(db_user)
        return User.model_validate(db_user)