import discord
from discord.ext import commands

from app.config import DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, VIP_ROLE_ID, VIP_CHANNEL_ID, CHAT_CHANNEL_ID
from app.api import api_client
from app.rabbitmq import start_rabbitmq_consumer

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

def create_embed(text: str) -> discord.Embed:
    return discord.Embed(description=text, color=0x009EFF)


@bot.tree.command(name="helper", description="Получить Arizona Helper VIP")
async def cmd_helper(interaction: discord.Interaction):
    text = (
        "👋 Здравствуйте!\n\n"
        "Теперь получение файлика доступно через удобный сайт в личном VIP кабинете.\n\n"
        "👉 **[Открыть VIP кабинет](https://mtgmods.com/dashboard)**"
    )
    await interaction.response.send_message(embed=create_embed(text), ephemeral=True)


@bot.tree.command(name="role", description="Восстановить/получить VIP роль на сервере")
async def cmd_role(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    discord_id = interaction.user.id
    
    vip_data = await api_client.check_vip_status(discord_id)
    
    if vip_data.get("error"):
        await interaction.followup.send(embed=create_embed("⚠️ Не удалось проверить VIP. Попробуйте позже."))
        return

    if not vip_data.get("is_vip"):
        await interaction.followup.send(embed=create_embed("❌ У вас нет активного VIP."))
        return

    guild = bot.get_guild(DISCORD_GUILD_ID)
    if not guild:
        await interaction.followup.send(embed=create_embed("❌ Ошибка: Сервер не найден."))
        return

    member = guild.get_member(discord_id)
    if not member:
        try:
            member = await guild.fetch_member(discord_id)
        except discord.NotFound:
            await interaction.followup.send(embed=create_embed("❌ Вы должны быть на сервере, чтобы получить роль."))
            return

    role = guild.get_role(VIP_ROLE_ID)
    if not role:
        await interaction.followup.send(embed=create_embed("❌ Ошибка: Роль VIP не найдена."))
        return

    if role not in member.roles:
        await member.add_roles(role)

        welcome_embed = discord.Embed(
            title='✅ Успешное получение VIP роли ✅',
            description=(
                f'🥳 Теперь вы - {role.mention}!\n\n'
                f'📁 Загляните в канал <#{VIP_CHANNEL_ID}> для продолжения\n\n'
            ),
            color=0x3498DB
        )
        if member.display_avatar:
            welcome_embed.set_thumbnail(url=member.display_avatar.url)

        chat_channel = bot.get_channel(CHAT_CHANNEL_ID)
        if chat_channel:
            await chat_channel.send(content=f'{member.mention}', embed=welcome_embed)

        await interaction.followup.send(embed=create_embed("✅ VIP роль успешно выдана."))
    else:
        await interaction.followup.send(embed=create_embed("✅ У вас уже есть VIP роль."))


@bot.tree.command(name="vip", description="Проверить информацию о своём VIP")
async def cmd_vip(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    discord_id = interaction.user.id
    
    vip_data = await api_client.check_vip_status(discord_id)
    
    if vip_data.get("error"):
        await interaction.followup.send(embed=create_embed("⚠️ Не удалось проверить VIP. Попробуйте позже."))
        return

    if not vip_data.get("is_vip"):
        await interaction.followup.send(embed=create_embed("❌ У вас нет активного VIP."))
        return

    license_info = vip_data.get("license", {})
    activated_at = license_info.get("activated_at")
    expires_at = license_info.get("expires_at", "FOREVER")
    method = license_info.get("purchase_method")
    price = license_info.get("purchase_price")

    text = (
        f"📅 **Активация VIP:** {activated_at}\n"
        f"🔒 **Доступ к VIP:** {expires_at}\n"
        f"ℹ️ **Оплата:** ${price} через {method}"
    )
    
    await interaction.followup.send(embed=create_embed(text))

if __name__ == "__main__":
    print("[*] Starting Discord Bot Microservice...")
    bot.run(DISCORD_BOT_TOKEN)