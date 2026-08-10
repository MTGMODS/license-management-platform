import json
import aio_pika
from telegram import Bot
from app.config import RABBITMQ_URL, TELEGRAM_VIP_CHAT_ID

async def start_rabbitmq_consumer(tg_bot: Bot):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()

    exchange = await channel.declare_exchange(
        name="mtgmods.bot.commands", 
        type=aio_pika.ExchangeType.TOPIC, 
        durable=True
    )

    queue = await channel.declare_queue("telegram_bot_queue", durable=True)
    await queue.bind(exchange, routing_key="telegram.#")

    async def on_message(message: aio_pika.IncomingMessage):
        async with message.process():
            payload = json.loads(message.body.decode("utf-8"))
            routing_key = message.routing_key
            tg_id = payload.get("telegram_id")

            if not tg_id:
                return

            try:
                if routing_key == "telegram.send_message":
                    text = payload.get("text", "")
                    await tg_bot.send_message(chat_id=tg_id, text=text, parse_mode="HTML")
                    print(f"[RabbitMQ] MSG sent to {tg_id}")

                elif routing_key == "telegram.kick_from_vip_chat":
                    await tg_bot.ban_chat_member(chat_id=TELEGRAM_VIP_CHAT_ID, user_id=tg_id)
                    await tg_bot.unban_chat_member(chat_id=TELEGRAM_VIP_CHAT_ID, user_id=tg_id)
                    print(f"[RabbitMQ] Soft-kicked {tg_id} from VIP chat")

            except Exception as e:
                print(f"[RabbitMQ Error] Failed to process {routing_key}: {e}")

    await queue.consume(on_message)
    print("[*] Telegram RabbitMQ Consumer is running...")
    return connection