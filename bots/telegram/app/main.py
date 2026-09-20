from telegram.ext import (
    ApplicationBuilder, CommandHandler, CallbackQueryHandler,
    PreCheckoutQueryHandler, MessageHandler, ChatJoinRequestHandler, filters, Application
)

from app.config import TELEGRAM_BOT_TOKEN
from app.api import api_client
from app.handlers.common import helper_cmd, start_cmd
from app.handlers.payments import pay_callback, pay_cmd, precheckout_handler, successful_payment_handler
from app.handlers.vip_chat import handle_join_request, vip_cmd
from app.rabbitmq import start_rabbitmq_consumer

async def post_init(app: Application):
    await api_client.start()
    app.create_task(start_rabbitmq_consumer(app.bot))
    print("[*] Telegram Bot initialized (API + RabbitMQ)")

async def post_shutdown(app: Application):
    await api_client.close()
    print("[*] Telegram Bot API Client closed")

def start_bot():
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).post_shutdown(post_shutdown).build()

    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler("pay", pay_cmd))
    app.add_handler(CommandHandler("vip", vip_cmd))
    app.add_handler(CommandHandler("helper", helper_cmd))
    app.add_handler(CallbackQueryHandler(pay_callback, pattern="^buy_"))
    app.add_handler(PreCheckoutQueryHandler(precheckout_handler))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment_handler))
    app.add_handler(ChatJoinRequestHandler(handle_join_request))

    print("[*] Starting Telegram Bot Microservice...")
    app.run_polling()
