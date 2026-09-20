from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import ContextTypes

from app.config import WEB_APP_URL
from app.handlers.payments import pay_cmd


async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.args and context.args[0].lower() == "pay":
        await pay_cmd(update, context)
        return

    text = "👋 Привет!\n\nArizona&Rodina Helper теперь доступен через удобный сайт"
    markup = InlineKeyboardMarkup(
        [[InlineKeyboardButton("Войти", web_app=WebAppInfo(url=WEB_APP_URL))]]
    )
    await update.message.reply_text(text, reply_markup=markup)


async def helper_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "👋 <b>Привет!</b>\n\n"
        "Теперь получение файлика через удобный VIP кабинет."
    )
    markup = InlineKeyboardMarkup(
        [[InlineKeyboardButton("👉 Открыть VIP кабинет", web_app=WebAppInfo(url=WEB_APP_URL))]]
    )
    await update.message.reply_text(text, reply_markup=markup, parse_mode="HTML")
