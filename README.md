# MTG VIP: Discord Bot Microservice

A lightweight Discord bot microservice for the MTG VIP platform. 

This service acts strictly as an adapter (the "hands") for Discord users. 

It connects to the central License Backend (the "brain") via HTTP to check user statuses and listens to RabbitMQ for backend-emitted commands.

## 🏗 Architecture Principle

**Bot services contain NO license or business logic.** 
They only:
*   Interact with the Discord API.
*   Expose Discord slash commands (`/role`, `/vip`, `/helper`).
*   Query the backend via HTTP when a user explicitly requests license information.
*   Execute commands received through RabbitMQ (e.g., removing a role when a license expires).

## 🚀 Features

*   **Slash Commands:**
    *   `/role` — Fetches VIP status from the backend and grants the VIP role if valid. Posts a welcome message to the general chat.
    *   `/vip` — Displays the user's active VIP subscription details (activation date, expiration date, price, method).
    *   `/helper` — Redirects users to the Telegram Mini App for secure script downloads.
*   **RabbitMQ Consumer:**
    *   Listens to the `mtgmods.bot.commands` topic exchange.
    *   `discord.send_message` — Sends direct messages (DMs) to users.
    *   `discord.remove_vip_role` — Safely removes the VIP role from a user.
*   **Secure API:** Communicates with the backend using a secure `x-bot-token` header.

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MTGMODS/mtg_discord_bot.git
   cd mtg_discord_bot
   ```

2. **Create Python venv :**
    ```bash
    python -m venv venv
    ```

3. **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4. **Configure environment variables:**
    Create a '.env' file in the root directory based on the '.env.example' template


## 🏃‍♂️ Running the Service

Start the bot directly using Python:
    ```bash
    python main.py
    ```

You should see:
    ```
    [*] Starting Discord Bot Microservice...
    [*] Discord RabbitMQ Consumer is running...
    ```
