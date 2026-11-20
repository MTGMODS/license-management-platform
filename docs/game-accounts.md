# Game accounts and public VIP list

The dashboard's Game account tab lets a user with an active VIP license save one game server and nickname.
Settings belong to the user, not a license key, and survive expiry or replacement.
They live in `game_accounts` in the license database; `users.nickname` remains the
website profile name. Game-account ownership is self-declared, not verified.

## API

Public URLs use `/v1/license`; the service's internal prefix is `/api/v1/license`.

- `GET /v1/license/me/game-account` — saved `{server_id, nickname}`, or `null`.
- `PUT /v1/license/me/game-account` — save and return `{server_id, nickname}`.
- `DELETE /v1/license/me/game-account` — remove settings, return HTTP 204.
- `GET /v1/license/game-accounts/public-list` — public JSON array, for example `["[20]Player_Name"]`.

The three private endpoints require an access-token Bearer header. The user ID
comes from that token. A subscription is not required to save settings.
Saving opts the game server and nickname into public display while eligible.
No user IDs, license keys or social accounts are exposed by the public endpoint.

The dashboard offers servers 1–33 and 101–103. The API also accepts the existing
IDs 200, 301–307 and 401–402. Nicknames are 3–50 Latin letters, digits or underscores and
start with a letter. Nicknames preserve case. Invalid input returns HTTP 422.

Only accounts with an `ACTIVE` license and `expires_at > now` (or no expiry)
appear. Lifetime licenses are included. Results are sorted by server and nickname;
duplicate entries are collapsed. No qualifying accounts returns HTTP 200 `[]`.

## Redis cache

There is no process-local Python cache. The first public request builds the list from the database. Subsequent requests
use `mtgmods:license:vip-list:v1`. Changes to game accounts, license activation,
replacement, admin edits/deletion and the expiry worker invalidate it after commit.
A Redis generation counter prevents an older SELECT from repopulating the cache
after a concurrent invalidation. HTTP responses use `Cache-Control: no-store`.

The safety TTL is five minutes, shortened to the earliest included license expiry.
There is no periodic refresh job; a cache miss is rebuilt on request. The TTL also
bounds stale data after manual SQL edits or failed invalidation. Redis failure falls
back to the database. Existing public statistics caches remain separate.

## Deployment

```bash
docker compose up -d --build license-service web
curl -fsS https://api.mtgmods.com/v1/license/game-accounts/public-list
```

License startup creates the new table through the existing SQLAlchemy
`Base.metadata.create_all` mechanism, in both PostgreSQL and SQLite debug mode.
No existing tables or records are rewritten. Existing nginx prefix routing
already forwards these endpoints.

The game client's parsing and highlighting are implemented separately.
