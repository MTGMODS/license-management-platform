# MTGMODS License Management Platform 🚀

A robust, microservices-based micro SaaS platform designed for managing licenses, securely distributing digital product, and tracking usage analytics.

This repository contains the backend core of the MTG VIP ecosystem (Arizona & Rodina Helper), built with high scalability, strict service isolation, and event-driven communication in mind.

## 🏗 Architecture Overview

The system is built on a **Microservices Architecture** using Python and FastAPI. 

It separates concerns into four isolated domains, communicating synchronously via HTTP (REST) and asynchronously via RabbitMQ.

### Core Microservices

*   🧠 **License Service (`license_service`)**
    *   The "Brain" of the platform.
    *   Handles VIP keys generation, activation, duration tracking, and HWID (Device) binding.
    *   Manages the core business logic and dashboard information.
*   👤 **User Service (`user_service`)**
    *   Handles user identity and authentication.
    *   Integrates OAuth2/OIDC for Telegram WebApp Login and Discord linking.
    *   Issues and validates JWT Bearer tokens for the entire platform.
*   📦 **Distribution Service (`distribution_service`)**
    *   Responsible for secure file delivery.
    *   Validates temporary download tokens and dynamically serves personalized `.lua` script files to prevent piracy.
*   📊 **Usage Service (`usage_service`)**
    *   Collects and processes analytics.
    *   Tracks script launches, active users, GeoIP data, and generates statistics for the admin dashboard.

### Adapters (Thin Clients)

The ecosystem also includes independent bot microservices that act strictly as interfaces, containing no business logic:
*   🤖 **Telegram Bot:** Handles Stars payments, VIP chat join requests, and automated kicks via RabbitMQ.
*   🤖 **Discord Bot:** Manages VIP role assignment/removal based on RabbitMQ events.

## 🛠 Tech Stack

*   **Framework:** FastAPI (Python 3.12+)
*   **Database:** SQLAlchemy (ORM)
*   **Message Broker:** RabbitMQ (aio-pika)
*   **Authentication:** JWT (JSON Web Tokens), OAuth2
*   **Networking:** aiohttp (for S2S communication)
*   **Deployment:** Docker & Docker Compose

## 📂 Repository Structure

```
license-management-platform/
├── license_service/         # VIP keys, HWID checks, Admin generation
├── user_service/            # Auth, Telegram/Discord OAuth, Profiles
├── distribution_service/    # Secure script downloads
├── usage_service/           # Launch analytics, GeoIP tracking
└── README.md
```

## 🔐 Security & Communication

- **Client to API:** Secured via `Authorization: Bearer <JWT>`.
- **Service to Service (Sync):** Internal HTTP requests are verified using a shared `x-internal-token` header.
- **Service to Service (Async):** Background tasks (like kicking expired users) are published to a RabbitMQ Topic Exchange (`mtgmods.bot.commands`).

## 🚀 Getting Started

### Docker Compose

Each service owns its `.env` and `Dockerfile`. Three isolated Postgres instances, one shared RabbitMQ.

```bash
git clone <repo-url>
cd license-management-platform

cp user_service/.env.example user_service/.env
cp license_service/.env.example license_service/.env
cp usage_service/.env.example usage_service/.env
cp distribution_service/.env.example distribution_service/.env

# Align secrets: JWT_SECRET + INTERNAL_SECRET_TOKEN (user ↔ license),
# RABBITMQ credentials (license ↔ distribution), change POSTGRES_PASSWORD values.

# VIP template (not in git):
#   distribution_service/app/builds/vip/Arizona Helper.lua

docker compose up --build
```

| Service | URL |
|---------|-----|
| User | http://localhost:8001/health |
| License | http://localhost:8002/health |
| Usage | http://localhost:8003/health |
| Distribution | http://localhost:8005/health |
| RabbitMQ UI | http://localhost:15672 (credentials from `license_service/.env`) |

Set `DEBUG_MODE=False` and Postgres URLs in each service `.env` for Compose. OAuth redirect URIs use **host** port `8001`.

### Local Python (SQLite)

```bash
cd user_service   # or license_service / usage_service / distribution_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # DEBUG_MODE=True
fastapi dev main.py --port 8001
```

Ports: users **8001**, license **8002**, usage **8003**, distribution **8005**.
