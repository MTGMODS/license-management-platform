from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.repository import UserRepository
from app.domain.models import User, UserStatus, UserRole
from app.domain.schemas import UpdateUser
from app.shared.exceptions import DomainException

class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def _get_active_user(self, user_id: int):
        db_user = await self.repo.get_by_id(user_id)
        if not db_user:
            raise DomainException("User not found.", status_code=404, error_code="USER_NOT_FOUND")
        
        if db_user.status == UserStatus.BANNED:
            raise DomainException("This account is banned.", status_code=403, error_code="USER_BANNED")
        elif db_user.status == UserStatus.DELETED:
            raise DomainException("This account was deleted.", status_code=403, error_code="USER_DELETED")
            
        return db_user

    async def get_user_by_id(self, user_id: int) -> User:
        db_user = await self._get_active_user(user_id)
        return User.model_validate(db_user)

    async def link_social(self, user_id: int, telegram_id: int = None, discord_id: int = None) -> User:
        db_user = await self._get_active_user(user_id)
        
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
    
    async def delete_my_account(self, user_id: int):
        db_user = await self._get_active_user(user_id)
        db_user.status = UserStatus.DELETED
        db_user.telegram_id = None
        db_user.discord_id = None
        await self.repo.update(db_user)
        return {"detail": "Account successfully deleted."}
    
    async def get_user_for_admin(self, target_user_id: int) -> User:
        db_user = await self.repo.get_by_id(target_user_id)
        
        if not db_user:
            raise DomainException("User not found.", status_code=404, error_code="USER_NOT_FOUND")
            
        return User.model_validate(db_user)

    async def search_users_for_admin(self, nickname: str = None, telegram_id: str = None, discord_id: str = None) -> list[User]:
        if not nickname and not telegram_id and not discord_id:
            return []
        db_users = await self.repo.search_users(nickname, telegram_id, discord_id)
        return [User.model_validate(user) for user in db_users]

    async def admin_update_user(self, target_user_id: int, payload: UpdateUser) -> dict:
        user = await self.repo.get_by_id(target_user_id) 
        if not user:
            raise DomainException(message="User not found", status_code=404, error_code="NOT_FOUND")

        update_data = payload.model_dump(exclude_unset=True)
        
        if "status" in update_data:
            user.status = update_data["status"]
        if "role" in update_data:
            user.role = update_data["role"]
        if "telegram_id" in update_data:
            user.telegram_id = update_data["telegram_id"]
        if "discord_id" in update_data:
            user.discord_id = update_data["discord_id"]

        await self.repo.update(user)
        return User.model_validate(user)