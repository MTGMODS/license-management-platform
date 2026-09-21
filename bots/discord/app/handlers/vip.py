import discord

from app.api import api_client
from app.config import CHAT_CHANNEL_ID, DISCORD_GUILD_ID, VIP_CHANNEL_ID, VIP_ROLE_ID
from app.formatting import create_embed, format_discord_datetime, format_vip_access


def register_vip_handlers(bot):
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
                title="✅ Успешное получение VIP роли ✅",
                description=(
                    f"🥳 Теперь вы - {role.mention}!\n\n"
                    f"📁 Загляните в канал <#{VIP_CHANNEL_ID}> для продолжения\n\n"
                ),
                color=0x3498DB,
            )
            if member.display_avatar:
                welcome_embed.set_thumbnail(url=member.display_avatar.url)

            chat_channel = bot.get_channel(CHAT_CHANNEL_ID)
            if chat_channel:
                await chat_channel.send(content=f"{member.mention}", embed=welcome_embed)

            await interaction.followup.send(embed=create_embed("✅ VIP роль успешно выдана."))
        else:
            await interaction.followup.send(embed=create_embed("✅ У вас уже есть VIP роль."))

    @bot.tree.command(name="vip", description="Проверить информацию о своём VIP")
    async def cmd_vip(interaction: discord.Interaction):
        await interaction.response.defer()
        discord_id = interaction.user.id

        vip_data = await api_client.check_vip_status(discord_id)

        if vip_data.get("error"):
            await interaction.followup.send(embed=create_embed("⚠️ Не удалось проверить VIP. Попробуйте позже."))
            return

        if not vip_data.get("is_vip"):
            await interaction.followup.send(embed=create_embed("❌ У вас нет активного VIP."))
            return

        license_info = vip_data.get("license", {})
        purchased_at = format_discord_datetime(
            license_info.get("purchased_at") or license_info.get("activated_at")
        )
        vip_access = format_vip_access(license_info.get("expires_at"))
        method = license_info.get("purchase_method")
        price = license_info.get("purchase_price")

        text = (
            f"📅 **Покупка VIP:** {purchased_at}\n"
            f"🔒 **Доступ к VIP:** {vip_access}\n"
            f"ℹ️ **Оплата:** ${price} через {method}"
        )

        await interaction.followup.send(embed=create_embed(text))
