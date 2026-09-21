from discord.ext import commands

from app.api import api_client
from app.handlers.common import register_common_handlers
from app.handlers.vip import register_vip_handlers
from app.rabbitmq import start_rabbitmq_consumer

import discord

intents = discord.Intents.default()
intents.guilds = True
intents.members = True

class DiscordBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="/", intents=intents)

    async def setup_hook(self):
        await api_client.start()
        self.loop.create_task(start_rabbitmq_consumer(self))
        try:
            await self.tree.sync()
        except Exception as e:
            print(f"[Discord] Failed to sync commands: {e}")

    async def close(self):
        await api_client.close()
        await super().close()

bot = DiscordBot()
register_common_handlers(bot)
register_vip_handlers(bot)
