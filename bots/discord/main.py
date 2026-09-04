from app.main import bot
from app.config import DISCORD_BOT_TOKEN

if __name__ == "__main__":
    print("[*] Starting Discord Bot Microservice...")
    bot.run(DISCORD_BOT_TOKEN)