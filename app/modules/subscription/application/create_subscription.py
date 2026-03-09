import secrets
from app.modules.subscription.domain.subscription import Subscription

def create_subscription(duration_days):
    key = secrets.token_hex(8)
    return Subscription(key, duration_days)