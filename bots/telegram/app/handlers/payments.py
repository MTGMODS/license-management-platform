import json

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, LabeledPrice, Update
from telegram.ext import ContextTypes

from app.api import api_client


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
    query = update.pre_checkout_query

    try:
        requested_plan = json.loads(query.invoice_payload)
    except (TypeError, json.JSONDecodeError):
        await query.answer(ok=False, error_message="Тариф больше недоступен. Создайте новый платёж.")
        return

    plans = await load_plans()
    if not plans:
        await query.answer(ok=False, error_message="Не удалось проверить тарифы. Попробуйте позже.")
        return

    plan_exists = any(
        plan["duration"] == requested_plan.get("duration")
        and plan["price"] == requested_plan.get("price")
        and plan["max_devices"] == requested_plan.get("max_devices")
        and plan["reset_limit"] == requested_plan.get("reset_limit")
        and plan["stars"] == query.total_amount
        for plan in plans.values()
    )
    if not plan_exists:
        await query.answer(ok=False, error_message="Тариф больше недоступен. Создайте новый платёж.")
        return

    await query.answer(ok=True)


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
