import asyncio
from pathlib import Path
import time

DOWNLOADS_DIR = Path("app/builds")
MAX_AGE_SECONDS = 60 * 60
CLEANUP_INTERVAL = 60 * 60

async def cleanup_old_files_task():
    while True:
        try:
            if DOWNLOADS_DIR.exists():
                now = time.time()

                for filepath in DOWNLOADS_DIR.glob("*.lua"):
                    if not filepath.is_file():
                        continue

                    if now - filepath.stat().st_mtime > MAX_AGE_SECONDS:
                        filepath.unlink()
                        print(f"[Cleanup Worker] Deleted expired build: {filepath.name}")

        except Exception as e:
            print(f"[Cleanup Worker] {e}")

        await asyncio.sleep(CLEANUP_INTERVAL)