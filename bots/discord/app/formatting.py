import discord


def create_embed(text: str) -> discord.Embed:
    return discord.Embed(description=text, color=0x009EFF)
