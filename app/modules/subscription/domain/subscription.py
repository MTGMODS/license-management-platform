from datetime import datetime, timedelta

class Subscription:
    def __init__(self, access_key, duration_days):
        self.access_key = access_key
        self.duration_days = duration_days
        self.created_at = datetime.utcnow()
        self.activated_at = None
        self.expires_at = None
        self.status = "not_activated"

    def activate(self):
        self.activated_at = datetime.utcnow()
        if self.duration_days:
            self.expires_at = self.activated_at + timedelta(days=self.duration_days)
        self.status = "active"

    def is_active(self):
        if self.status != "active":
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True