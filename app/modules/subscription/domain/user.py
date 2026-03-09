class User:
    def __init__(self, telegram_id=None, discord_id=None, nickname=None):
        self.telegram_id = telegram_id
        self.discord_id = discord_id
        self.nickname = nickname