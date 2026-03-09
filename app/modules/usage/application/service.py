from sqlalchemy.orm import Session
from ..infrastructure.repository import LaunchRepository, LaunchModel

class UsageService:
    def __init__(self, db: Session):
        self.repo = LaunchRepository(db)

    def log_launch(self, version: str, device: str, server_id: str, country: str):
        new_launch = LaunchModel(version=version, device=device, server_id=server_id, country=country)
        self.repo.save(new_launch)
        return True