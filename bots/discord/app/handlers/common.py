import discord

from app.formatting import create_embed


def register_common_handlers(bot):
    @bot.tree.command(name="helper", description="Получить Arizona Helper VIP")
    async def cmd_helper(interaction: discord.Interaction):
        text = (
            "👋 Здравствуйте!\n\n"
            "Теперь получение файлика доступно через удобный сайт в личном VIP кабинете.\n\n"
            "👉 **[Открыть VIP кабинет](https://mtgmods.com/dashboard)**"
        )
        await interaction.response.send_message(embed=create_embed(text), ephemeral=True)
