from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.repository import UserRepository
from app.domain.models import User
from app.shared.exceptions import DomainException

class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def get_user_by_id(self, user_id: int) -> User | None:
        db_user = await self.repo.get_by_id(user_id)
        if not db_user:
            return None
        
        return User.model_validate(db_user)

    async def link_account(
        self, 
        nickname: str, 
        telegram_id: int = None, 
        discord_id: int = None,
        avatar_url: str = None
    ) -> User:
        db_user = None
        
        if telegram_id:
            db_user = await self.repo.get_by_telegram_id(telegram_id)
        if not db_user and discord_id:
            db_user = await self.repo.get_by_discord_id(discord_id)

        if db_user:
            #
            if db_user.is_banned:
                raise DomainException(
                    message="This account is banned.", 
                    status_code=403, 
                    error_code="USER_BANNED"
                )

            if telegram_id: db_user.telegram_id = telegram_id
            if discord_id: db_user.discord_id = discord_id
            db_user.nickname = nickname
            if avatar_url: db_user.avatar_url = avatar_url
            
            db_user = await self.repo.update(db_user)
        else:
            db_user = await self.repo.create(
                nickname=nickname, 
                telegram_id=telegram_id, 
                discord_id=discord_id,
                avatar_url=avatar_url
            )

        return User.model_validate(db_user)