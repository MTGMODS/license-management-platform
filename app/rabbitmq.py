import json
import aio_pika
import discord
from app.config import RABBITMQ_URL, DISCORD_GUILD_ID, VIP_ROLE_ID

async def start_rabbitmq_consumer(discord_bot):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()

    exchange = await channel.declare_exchange(
        name="mtgmods.bot.commands", 
        type=aio_pika.ExchangeType.TOPIC, 
        durable=True
    )

    queue = await channel.declare_queue("discord_bot_queue", durable=True)
    await queue.bind(exchange, routing_key="discord.#")

    async def on_message(message: aio_pika.IncomingMessage):
        async with message.process():
            payload = json.loads(message.body.decode("utf-8"))
            routing_key = message.routing_key
            discord_id = payload.get("discord_id")

            if not discord_id:
                return

            try:
                if routing_key == "discord.send_message":
                    text = payload.get("text", "")
                    user = await discord_bot.fetch_user(discord_id)
                    if user:
                        await user.send(text)
                        print(f"[RabbitMQ] Sent message to {discord_id}")

                elif routing_key == "discord.remove_vip_role":
                    guild = discord_bot.get_guild(DISCORD_GUILD_ID)
                    if guild:
                        member = guild.get_member(discord_id)
                        if not member:
                            try:
                                member = await guild.fetch_member(discord_id)
                            except discord.NotFound:
                                member = None

                        if member:
                            role = guild.get_role(VIP_ROLE_ID)
                            if role and role in member.roles:
                                await member.remove_roles(role, reason=payload.get("reason", "vip_expired"))
                                print(f"[RabbitMQ] Removed VIP role from {discord_id}")

            except Exception as e:
                print(f"[RabbitMQ Error] Failed to process {routing_key}: {e}")

    await queue.consume(on_message)
    print("[*] Discord RabbitMQ Consumer is running...")
    return connection