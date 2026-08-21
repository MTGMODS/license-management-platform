import json
from datetime import datetime, timezone

from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, LabeledPrice
from telegram.ext import (
    ApplicationBuilder, CommandHandler, CallbackQueryHandler,
    PreCheckoutQueryHandler, MessageHandler, ChatJoinRequestHandler, filters, ContextTypes, Application
)

from app.config import TELEGRAM_BOT_TOKEN, TELEGRAM_VIP_CHAT_ID, WEB_APP_URL
from app.api import api_client
from app.rabbitmq import start_rabbitmq_consumer

def format_datetime(value: str | None) -> str:
    if not value or value == "FOREVER":
        return value or "—"
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).strftime("%d.%m.%Y %H:%M")
    except (TypeError, ValueError):
        return value

def format_price(value) -> str:
    try:
        return str(int(float(value)))
    except (TypeError, ValueError):
        return str(value)

async def load_plans() -> dict | None:
    res = await api_client.get_tariffs()
    if res.get("error") or res.get("status") != "success":
        return None

    plans = res.get("data", {}).get("plans") or []
    if not plans:
        return None

    return {
        f"buy_{plan['duration_days']}": {
            "stars": plan["telegram_stars_price"],
            "duration": plan["duration_days"],
            "price": plan["price"],
            "max_devices": plan["max_devices"],
            "reset_limit": plan["reset_limit"],
            "title": f"VIP на {plan['duration_days']} дней",
        }
        for plan in plans
    }

async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.args and context.args[0].lower() == "pay":
        await pay_cmd(update, context)
        return

    text = ("👋 Привет!\n\nArizona&Rodina Helper теперь доступен через удобный сайт")
    markup = InlineKeyboardMarkup([[InlineKeyboardButton("Войти", web_app=WebAppInfo(url=WEB_APP_URL))]])
    await update.message.reply_text(text, reply_markup=markup)

async def pay_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    plans = await load_plans()
    if not plans:
        await update.message.reply_text("⚠️ Не удалось загрузить тарифы. Попробуйте позже.")
        return

    keyboard = [
        [InlineKeyboardButton(f"{p['duration']} дней — {p['stars']} ⭐", callback_data=k)]
        for k, p in plans.items()
    ]
    await update.message.reply_text(
        "👉 Выберите срок для покупки VIP через Stars:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )

async def pay_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    plans = await load_plans()
    plan = plans.get(query.data) if plans else None
    if not plan:
        await query.edit_message_text("⚠️ Не удалось загрузить тарифы. Попробуйте позже.")
        return

    prices = [LabeledPrice(plan["title"], plan["stars"])]
    payload = json.dumps({
        "duration": plan["duration"],
        "price": plan["price"],
        "max_devices": plan["max_devices"],
        "reset_limit": plan["reset_limit"],
    }, separators=(",", ":"))

    await context.bot.send_invoice(
        chat_id=update.effective_user.id,
        title=plan["title"],
        description="Оплата за VIP доступ",
        payload=payload,
        provider_token="",
        currency="XTR",
        prices=prices,
    )

async def precheckout_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.pre_checkout_query.answer(ok=True)

async def successful_payment_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        plan = json.loads(update.message.successful_payment.invoice_payload)
    except (TypeError, json.JSONDecodeError):
        await update.message.reply_text("❌ Произошла ошибка при генерации ключа!\n👉 Обратитесь к @mtg_mods")
        return

    res = await api_client.generate_license(
        duration_days=plan["duration"],
        amount=plan["price"],
        max_devices=plan["max_devices"],
        reset_limit=plan["reset_limit"],
    )

    if res.get("error") or res.get("status") != "success" or not res.get("data").get("key"):
        await update.message.reply_text("❌ Произошла ошибка при генерации ключа!\n👉 Обратитесь к @mtg_mods")
        return

    key = res.get("data").get("key")

    await update.message.reply_text(
        f"✅ <b>Успешное приобретение VIP</b> ✅\n\n"
        f"🔑 <b>Ваш ЛИЧНЫЙ ключ: <code>{key}</code></b>\n"
        f"👉 <b>Активируйте его </b>\n\n"
        f"❤️ <b>Спасибо за покупку</b> ❤️",
        parse_mode="HTML"
    )

async def handle_join_request(update: Update, context: ContextTypes.DEFAULT_TYPE):
    request = update.chat_join_request
    chat_id = request.chat.id
    telegram_id = request.from_user.id

    if chat_id != TELEGRAM_VIP_CHAT_ID:
        return

    vip_data = await api_client.check_vip_status(telegram_id)

    if vip_data.get("is_vip"):
        await context.bot.approve_chat_join_request(chat_id, telegram_id)
        await context.bot.send_message(chat_id=telegram_id, text="✅ Вы добавлены в VIP чат ✅")

        license_info = vip_data.get("license")
        expires_at = format_datetime(license_info.get("expires_at", "FOREVER"))
        price = format_price(license_info.get("purchase_price"))
        method = license_info.get("purchase_method")

        welcome_text = (
            f"👋 <b>{request.from_user.mention_html()} ({telegram_id}), добро пожаловать!</b>\n\n"
            f"🔒 <b>Доступ к VIP:</b> до {expires_at}\n"
            f"ℹ️ <b>Оплата:</b> ${price} через {method}"
        )
        await context.bot.send_message(chat_id=chat_id, text=welcome_text, parse_mode="HTML")
    else:
        await context.bot.decline_chat_join_request(chat_id, telegram_id)
        decline_text = (
            f"❌ <b>У вас нет активного VIP.</b>\n\n"
            f"Чтобы приобрести VIP, перейдите на сайт хелпера по кнопке ниже или используйте команду /pay"
        )
        markup = InlineKeyboardMarkup([[
            InlineKeyboardButton("Открыть VIP кабинет", web_app=WebAppInfo(url=WEB_APP_URL))
        ]])
        await context.bot.send_message(chat_id=telegram_id, text=decline_text, parse_mode="HTML", reply_markup=markup)

async def helper_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "👋 <b>Привет!</b>\n\n"
        "Теперь получение файлика через удобный VIP кабинет."
    )
    markup = InlineKeyboardMarkup([[InlineKeyboardButton("👉 Открыть VIP кабинет", web_app=WebAppInfo(url=WEB_APP_URL))]])
    await update.message.reply_text(text, reply_markup=markup, parse_mode="HTML")

async def vip_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    
    vip_data = await api_client.check_vip_status(telegram_id)
    
    if vip_data.get("error"):
        await update.message.reply_text("⚠️ <b>Не удалось проверить VIP. Попробуйте позже.</b>", parse_mode="HTML")
        return

    if not vip_data.get("is_vip"):
        await update.message.reply_text("❌ <b>У вас нет активного VIP.</b>", parse_mode="HTML")
        return

    license_info = vip_data.get("license", {})
    activated_at = format_datetime(license_info.get("activated_at"))
    expires_at = format_datetime(license_info.get("expires_at", "FOREVER"))
    method = license_info.get("purchase_method")
    price = format_price(license_info.get("purchase_price"))

    text = (
        f"📅 <b>Активация VIP:</b> {activated_at}\n"
        f"🔒 <b>Доступ к VIP:</b> до {expires_at}\n"
        f"ℹ️ <b>Оплата:</b> ${price} через {method}"
    )
    
    await update.message.reply_text(text, parse_mode="HTML")

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