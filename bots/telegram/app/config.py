import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_VIP_CHAT_ID = int(os.getenv("TELEGRAM_VIP_CHAT_ID"))
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://mtgmods.com/helper")

RABBITMQ_URL = os.getenv("RABBITMQ_URL")

BACKEND_API_URL = os.getenv("BACKEND_API_URL")
BOT_SECRET_TOKEN = os.getenv("BOT_SECRET_TOKEN")