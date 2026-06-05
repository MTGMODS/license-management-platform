import os
import geoip2.database
import logging

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "infrastructure", "data", "GeoLite2-Country.mmdb")

reader = None

try:
    reader = geoip2.database.Reader(DB_PATH)
except Exception as e:
    logger.error(f"GeoLite2 database not found at {DB_PATH}. Country tracking disabled. Error: {e}")

def get_country_iso_code(ip: str) -> str:
    if not reader or not ip or ip in ("127.0.0.1", "localhost", "0.0.0.0"):
        return "UNKNOWN"
    try:
        response = reader.country(ip)
        return response.country.iso_code or "UNKNOWN"
    except geoip2.errors.AddressNotFoundError:
        return "UNKNOWN"
    except Exception as e:
        logger.warning(f"Error resolving IP {ip}: {e}")
        return "UNKNOWN"