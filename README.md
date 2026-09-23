# MTG MODS platform

Micro-SaaS around a freemium digital product: identity, licenses, usage analytics, protected file delivery, public web app, Telegram and Discord adapters.

```
├── services/user/           # OAuth, JWT, profiles
├── services/license/        # keys, HWID, tariffs, sales, bot API
├── services/usage/          # launch telemetry, public stats
├── services/distribution/   # one-shot VIP file download
├── web/                     # SPA (cabinet, open stats, admin)
├── bots/telegram/           # Stars, VIP chat, Mini App entry
├── bots/discord/            # VIP role / DMs
└── docker-compose.yml
```

APIs talk over HTTP and RabbitMQ. Bots and license↔user stay on the **Docker network** (not through public nginx). The browser and Telegram Mini App still use `https://api.mtgmods.com` / `https://mtgmods.com`.

## Stack

Python 3.12, FastAPI, PostgreSQL 16 (one database per service), RabbitMQ 3.13, React 19 + Vite, Docker Compose.

## Run

Each unit has `.env.example`. Copy and align secrets **before** `up`:

```bash
cp services/user/.env.example services/user/.env
cp services/license/.env.example services/license/.env
cp services/usage/.env.example services/usage/.env
cp services/distribution/.env.example services/distribution/.env
cp bots/telegram/.env.example bots/telegram/.env
cp bots/discord/.env.example bots/discord/.env
```

Must match across files:

- `JWT_SECRET` — user + license
- `INTERNAL_SECRET_TOKEN` — user + license
- `BOT_SECRET_TOKEN` — license + both bots
- RabbitMQ user/password — license `.env` (broker) + `RABBITMQ_URL` in license, distribution, bots (`@rabbitmq`)

VIP template and obfuscator are **not** in git. On the server, overlay:

`services/distribution/app/builds/vip/` and `services/distribution/app/tools/`

then rebuild `distribution-service`.

```bash
docker compose up --build
```

The Compose project name stays `mtgmods_backend` so existing Postgres volumes keep their names.

| Service | URL |
|---------|-----|
| User | http://localhost:8001/health |
| License | http://localhost:8002/health |
| Usage | http://localhost:8003/health |
| Distribution | http://localhost:8005/health |
| Web | http://localhost:8080 |
| RabbitMQ UI | http://localhost:15672 |

OAuth redirect URIs for local compose use host port **8001**. Production callbacks: `https://api.mtgmods.com/v1/users/auth/...` (see comments in `services/user/.env.example`).

Bots call `http://license-service:8000/api/v1/license/...`. After switching from standalone bot containers, stop the old ones — two processes with the same Telegram token will fight.

`web` bakes `VITE_API_URL` at **image build** (default `https://api.mtgmods.com`). Override: `VITE_API_URL=... docker compose build web`.

## Local API without Docker

```bash
cd services/user   # or license / usage / distribution
python -m venv venv
venv/Scripts/activate   # Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # set DEBUG_MODE=True and SQLite URLs
fastapi dev main.py --port 8001
```

Ports: **8001 / 8002 / 8003 / 8005**. Vite for the SPA: `cd web && npm ci && npm run dev` (port 5173; optional `VITE_DEV_*_TARGET` in `web/.env.example`).

## License

MIT — see `LICENSE` in the repository root.
