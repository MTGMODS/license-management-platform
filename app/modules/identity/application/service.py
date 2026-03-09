from sqlalchemy.orm import Session
from ..infrastructure.repository import UserRepository
from ..domain.models import User

class IdentityService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register_telegram_user(self, telegram_id: int, nickname: str) -> User:

        db_user = self.repo.get_by_telegram_id(telegram_id)
        if not db_user:
            db_user = self.repo.create(telegram_id, nickname)
            
        return User(
            id=db_user.id, 
            telegram_id=db_user.telegram_id, 
            discord_id=db_user.discord_id, 
            nickname=db_user.nickname
        )