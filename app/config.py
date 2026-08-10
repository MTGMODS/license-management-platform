import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_GUILD_ID = int(os.getenv("DISCORD_GUILD_ID"))
VIP_ROLE_ID = int(os.getenv("VIP_ROLE_ID"))
VIP_CHANNEL_ID = int(os.getenv("VIP_CHANNEL_ID"))
CHAT_CHANNEL_ID = int(os.getenv("CHAT_CHANNEL_ID"))

BACKEND_API_URL = os.getenv("BACKEND_API_URL")
RABBITMQ_URL = os.getenv("RABBITMQ_URL")