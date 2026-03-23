from sqlalchemy.orm import Session
from ..infrastructure.repository import UserRepository
from ..domain.models import User
from app.shared.exceptions import DomainException

class IdentityService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def get_user_by_id(self, user_id: int) -> User | None:
        db_user = self.repo.get_by_id(user_id)
        if not db_user:
            return None
        return User(
            id=db_user.id,
            telegram_id=db_user.telegram_id,
            discord_id=db_user.discord_id,
            nickname=db_user.nickname
        )

    def link_account(self, nickname: str, telegram_id: int = None, discord_id: int = None) -> User:
        db_user = None
        
        if telegram_id:
            db_user = self.repo.get_by_telegram_id(telegram_id)
        if not db_user and discord_id:
            db_user = self.repo.get_by_discord_id(discord_id)

        if db_user:
            db_user = self.repo.update(db_user, telegram_id, discord_id, nickname)
        else:
            db_user = self.repo.create(nickname, telegram_id, discord_id)

        return User(
            id=db_user.id,
            telegram_id=db_user.telegram_id,
            discord_id=db_user.discord_id,
            nickname=db_user.nickname
        )
    