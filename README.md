# MTGMODS License Management Platform 🚀

A robust, microservices-based SaaS platform designed for managing licenses, securely distributing game modifications (Lua scripts), and tracking usage analytics.

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

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose installed.
- Python 3.12+ (for local development).

### Environment Setup

Each microservice requires its own `.env` file. Copy the provided `.env.example` templates and fill in the appropriate database URIs, secret keys, and broker URLs:

```
cp license_service/.env.example license_service/.env
cp user_service/.env.example user_service/.env
cp distribution_service/.env.example distribution_service/.env
cp usage_service/.env.example usage_service/.env
```

*Note: Ensure* *`x-internal-token`* *and JWT secrets match across services for seamless Service-to-Service (S2S) communication.*

## 🔐 Security & Communication

- **Client to API:** Secured via `Authorization: Bearer <JWT>`.
- **Service to Service (Sync):** Internal HTTP requests are verified using a shared `x-internal-token` header.
- **Service to Service (Async):** Background tasks (like kicking expired users) are published to a RabbitMQ Topic Exchange (`mtgmods.bot.commands`).

## 📜 License

This prject MIT license ownered Bohdan Marher (MGG MODS)

