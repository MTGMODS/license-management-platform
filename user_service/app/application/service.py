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

    async def authenticate(self, provider: str, provider_id: int, nickname: str, avatar_url: str = None) -> User:
        db_user = await self.repo.get_by_telegram_id(provider_id) if provider == "telegram" else await self.repo.get_by_discord_id(provider_id)

        if db_user:
            if db_user.is_banned:
                raise DomainException("This account is banned.", status_code=403, error_code="USER_BANNED")
            db_user.nickname = nickname
            if avatar_url: db_user.avatar_url = avatar_url
            db_user = await self.repo.update(db_user)
        else:
            tg_id = provider_id if provider == "telegram" else None
            ds_id = provider_id if provider == "discord" else None
            db_user = await self.repo.create(nickname=nickname, telegram_id=tg_id, discord_id=ds_id, avatar_url=avatar_url)

        return User.model_validate(db_user)

    async def link_provider(self, user_id: int, provider: str, provider_id: int) -> User:
        db_user = await self.repo.get_by_id(user_id)
        if not db_user:
            raise DomainException("This user don't found.", status_code=404, error_code="USER_NOT_FOUND")

        existing = await self.repo.get_by_telegram_id(provider_id) if provider == "telegram" else await self.repo.get_by_discord_id(provider_id)
        if existing and existing.id != user_id:
            raise DomainException(f"Цей {provider} вже прив'язаний до іншого профілю.", status_code=409, error_code="PROVIDER_ALREADY_LINKED")

        if provider == "telegram": db_user.telegram_id = provider_id
        if provider == "discord": db_user.discord_id = provider_id
        
        db_user = await self.repo.update(db_user)
        return User.model_validate(db_user)