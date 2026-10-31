# Current architecture

These C4-style views describe the implementation in this repository, checked against source on **2026-10-31**. They cover the platform around the existing Arizona&Rodina Helper, a freemium software product for SA-MP players. Product development is outside this repository.

The diagrams use Mermaid flowcharts with explicit system, container and component boundaries. A container is a running application or data service; file stores are labeled separately. Deployment details such as host ports supplement the container view.

## Level 1 — System context

[Mermaid source](architecture-context.mmd) · [Full-size SVG](architecture-context.svg)

![System context: people, platform, existing product and external services](architecture-context.svg)

Visitors use public pages, free downloads and analytics. Customers sign in through Telegram or Discord to manage subscriptions, devices and VIP downloads. Administrators manage licenses and purchases. The game client sends license checks and launch telemetry; the product's installer also fetches personalized files.

Telegram Stars checkout runs in the Telegram bot. Other payment channels are external marketplaces or manual payment instructions. An external purchase is verified manually before a key is issued; there is no marketplace payment API or webhook in these views. The Telegram Mini App opens the same website used in a regular browser.

## Level 2 — Containers

[Mermaid source](architecture-c4.mmd) · [Full-size SVG](architecture-c4.svg)

![Container view: gateway, web, four APIs, bots, databases, cache, broker and files](architecture-c4.svg)

- **Host nginx** terminates HTTPS and proxies to the published Web/API ports. It belongs to the platform deployment but runs outside Docker Compose. The web container has a separate nginx serving the SPA and the public installer.
- **User, License and Usage** each own a PostgreSQL database. Cross-service user IDs are logical references, not cross-database foreign keys. License obtains user profiles and social IDs from User over internal HTTP.
- **Redis** holds rebuildable public statistics and refresh locks for License and Usage. Accounts, licenses and purchases remain in PostgreSQL.
- **RabbitMQ** carries VIP-build requests and correlated replies. License waits for the reply containing a download URL, so the browser's download request waits for this workflow. The same broker delivers expiry commands through the `mtgmods.bot.commands` topic exchange to `telegram.#` and `discord.#` consumers.
- **Distribution** generates personalized files and serves temporary downloads without a relational database. Only Distribution accesses private templates, the obfuscator and personalized builds. Web mounts only the public installer subdirectory read-only.

API prefixes at the public gateway omit the backend's `/api` segment: `/v1/license/...` becomes `/api/v1/license/...`, with equivalent mappings for User, Usage and Distribution. Ports in the diagram are published host ports; each FastAPI container listens on port 8000 internally.

## Level 3 — License Service components

[Mermaid source](architecture-license-components.mmd) · [Full-size SVG](architecture-license-components.svg)

![Actual License Service components and concrete dependencies](architecture-license-components.svg)

The component view groups related Python functions and classes; each box is not a separate process. The API, caches and expiry task run inside the License application process.

1. **REST routers** validate Pydantic DTOs and use route-specific guards. Dashboard routes require access JWTs, admin routes additionally require the `ADMIN` role, and bot routes require `x-bot-token`. Public statistics, tariffs and the game-client license-check route do not use the dashboard JWT guard.
2. **LicenseService** receives an SQLAlchemy `AsyncSession`, creates concrete `LicenseRepository`, `TransactionRepository` and `UserServiceClient` objects, and performs business operations. The application layer directly uses infrastructure and ORM types. FastAPI injects sessions and guards; application-owned repository ports and a complete dependency-inversion composition root are not implemented.
3. **Download orchestration** is in `user_routes.request_download`: it checks the active license through `LicenseService`, then calls `publish_file_generation_event` directly. There is no separate injected Download use-case class.
4. **Sales statistics** use two caches created in FastAPI lifespan: current subscriptions and legacy lifetime licenses. `LicenseStatsService` supplies loader callbacks; each loader creates its own database session and queries `LicenseRepository`, including when a refresh runs after the HTTP response.
5. **Expiry processing** is an asyncio task started in lifespan. It opens its own session, updates expired licenses, commits, resolves social IDs through `UserServiceClient`, and publishes bot commands. It runs within the License container.
6. **Error handling** registers `DomainException` and `RequestValidationError` handlers. `HTTPException` uses FastAPI's standard handler; the client-check route also has its own catch/response branch. Diagnostics use Python logging in the cache and stdout messages in integrations/expiry processing. The diagram does not assert a universal sanitized error boundary or distributed tracing.

## Operational boundaries

The RabbitMQ RPC reply wait is limited to **30 seconds** after connection/channel/queue/publish setup. This is not an enforced 30-second end-to-end build deadline. A timeout does not itself cancel a build already accepted by Distribution.

Correlation IDs match replies; they do not provide request deduplication. A database commit followed by command publication is not atomic, and the implementation has no transactional outbox. Compose defines one instance of each service, broker and database; these diagrams do not assert replication, high availability or exactly-once delivery.

For cache timing, file cleanup and deployment instructions, see the [root README](../README.md#public-statistics), [file-delivery lifecycle](../README.md#file-delivery-lifecycle) and [Docker setup](../README.md#run-with-docker).

## Source references

- Runtime topology and mounts: [docker-compose.yml](../docker-compose.yml).
- Host routing: [API virtual host](../gateway/sites-available/api.mtgmods.com), [website virtual host](../gateway/sites-available/mtgmods.com); static installer: [web nginx](../web/nginx.conf).
- OAuth and Mini App authentication: [User auth routes](../services/user/app/api/auth_routes.py).
- License lifecycle wiring: [app/main.py](../services/license/app/main.py).
- Routes: [user/download](../services/license/app/api/user_routes.py), [client](../services/license/app/api/client_routes.py), [admin](../services/license/app/api/admin_routes.py), [bot](../services/license/app/api/bot_routes.py), [statistics](../services/license/app/api/stats_routes.py).
- Guards and DTOs: [JWT helpers](../services/license/app/application/jwt_utils.py), [schemas](../services/license/app/domain/schemas.py).
- Business logic and data access: [services](../services/license/app/application/service.py), [repositories and ORM models](../services/license/app/infrastructure/repository.py), [session factory](../services/license/app/shared/database.py).
- Integrations: [HTTP client](../services/license/app/infrastructure/external_clients.py), [messaging](../services/license/app/infrastructure/messaging.py), [statistics cache](../services/license/app/infrastructure/stats_cache.py), [expiry task](../services/license/app/application/worker.py), [error handlers](../services/license/app/shared/exceptions.py).
- Build consumer and reply: [Distribution messaging](../services/distribution/app/infrastructure/messaging.py); bot consumers: [Telegram](../bots/telegram/app/rabbitmq.py), [Discord](../bots/discord/app/rabbitmq.py).

The `.mmd` files are the editable diagram sources. Regenerate the matching SVG whenever a source changes; the SVG previews also work when an embedded Mermaid renderer is unavailable.
