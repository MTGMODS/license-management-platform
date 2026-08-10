# MTG VIP: Telegram Bot Microservice

A lightweight Telegram bot microservice for the MTG VIP platform. 

This service acts strictly as an adapter (the "hands") for Telegram users. 

It connects to the central License Backend (the "brain") via HTTP to check user statuses and listens to RabbitMQ for backend-emitted commands.

## 🏗 Architecture Principle

**Bot services contain NO license or business logic.** 
They only:
*   Interact with the Telegram API.
*   Expose Telegram commands (`/start`, `/pay`).
*   Query the backend via HTTP when a user explicitly requests license information or attempts to join the VIP chat.
*   Execute commands received through RabbitMQ (e.g., kicking a user from the chat when a license expires).

## 🚀 Features

*   **Slash Commands:**
    *   `/start` — Redirects users to the Telegram Mini App (VIP Cabinet) for secure script downloads and profile management.
    *   `/pay` — Initiates an automated invoice for purchasing VIP via Telegram Stars.
*   **VIP Chat Management:**
    *   Automatically handles `ChatJoinRequest`. Validates the user's VIP status via the backend before approving or declining the request.
    *   Posts an automated welcome message with subscription details when a user joins the VIP chat.
*   **RabbitMQ Consumer:**
    *   Listens to the `mtgmods.bot.commands` topic exchange.
    *   `telegram.send_message` — Sends direct messages (DMs) to users.
    *   `telegram.kick_from_vip_chat` — Safely removes (soft-kicks) a user from the VIP chat when their license expires, allowing them to re-join after a new purchase.
*   **Secure API:** Communicates with the backend using a secure `x-bot-token` header.

---

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MTGMODS/mtg_telegram_bot.git
   cd mtg_telegram_bot
   ```

2. **Configure environment variables:**
    Create a '.env' file in the root directory based on the '.env.example' template


3. **🐳 Running the Service (Docker - Recommended)**

    Build and start the container in the background:
    ```
    docker-compose up -d --build
    ```

    Check the bot logs:
    ```
    docker logs -f mtg_telegram_bot
    ```

    To stop the bot:
    ```
    docker-compose down
    ```

---

## 🏃‍♂️ Local Development (Without Docker)

1) **Create Python venv :**
    ```bash
    python -m venv venv
    ```

2) **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3) **Start the Telegram bot:** 
    ```bash
    python main.py
    ```
