"""Event-invalidated VIP list, bounded by expiry and a five-minute safety TTL."""
import json
import logging
import time
from collections.abc import Awaitable, Callable

from redis.asyncio import Redis
from redis.asyncio.retry import Retry
from redis.backoff import NoBackoff
from redis.exceptions import RedisError

from app.shared.config import settings

logger = logging.getLogger(__name__)
VipListResult = tuple[list[str], float | None]

_PUBLISH = """
if (redis.call('GET', KEYS[1]) or '0') == ARGV[1] then
    redis.call('SET', KEYS[2], ARGV[2], 'PX', ARGV[3])
    return 1
end
return 0
"""


class VipListCache:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.key = "mtgmods:license:vip-list:v1"
        self.version_key = f"{self.key}:version"

    async def invalidate(self):
        try:
            async with self.redis.pipeline(transaction=True) as pipe:
                pipe.incr(self.version_key)
                pipe.delete(self.key)
                await pipe.execute()
        except RedisError:
            logger.warning("VIP list invalidation failed; safety TTL will expire the cache")

    async def get(self, loader: Callable[[], Awaitable[VipListResult]]) -> list[str]:
        try:
            version, raw = await self.redis.mget(self.version_key, self.key)
            version = version or "0"
            if raw is not None:
                try:
                    entry = json.loads(raw)
                    if (isinstance(entry["data"], list)
                            and all(isinstance(item, str) for item in entry["data"])
                            and entry["valid_until"] > time.time()):
                        return entry["data"]
                except (ValueError, KeyError, TypeError):
                    logger.warning("Ignoring invalid VIP list cache")
        except RedisError:
            data, _ = await loader()
            return data

        # Count DB query time against TTL; never extend a cached licence's expiry.
        started = time.time()
        data, expires_at = await loader()
        valid_until = min(started + 300, expires_at) if expires_at is not None else started + 300
        ttl_ms = int((valid_until - time.time()) * 1000)
        if ttl_ms > 0:
            try:
                published = await self.redis.eval(
                    _PUBLISH, 2, self.version_key, self.key, version,
                    json.dumps({"data": data, "valid_until": valid_until}), ttl_ms,
                )
                if not published:
                    # A mutation committed during the SELECT: don't return its old snapshot.
                    data, _ = await loader()
            except RedisError:
                logger.warning("Could not cache VIP list")
        return data


vip_list_cache = VipListCache(Redis.from_url(
    settings.REDIS_URL, decode_responses=True,
    socket_connect_timeout=0.5, socket_timeout=0.5,
    retry=Retry(NoBackoff(), 0),
))
