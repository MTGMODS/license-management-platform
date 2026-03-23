from sqlalchemy.orm import Session
from ..infrastructure.repository import LaunchRepository

class UsageService:
    def __init__(self, db: Session):
        self.repo = LaunchRepository(db)

    def log_launch(self, version: str, device: str, server_id: str, country: str):
        return self.repo.save(version, device, server_id, country)