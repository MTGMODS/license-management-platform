import asyncio
import logging

from google import genai
from google.genai import errors, types

logger = logging.getLogger(__name__)

GEMINI_MODELS = (
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
)


class GeminiError(Exception):
    """A generation failure with a message that is safe to return to the caller."""


async def generate_text(*, api_key: str, text: str, instructions: str) -> str:
    http_options = types.HttpOptions(
        api_version="v1beta",
        timeout=10_000,
        retry_options=types.HttpRetryOptions(
            attempts=2,
            initial_delay=3,
            http_status_codes=[408, 499, 500, 502, 503, 504],
        ),
    )
    config = types.GenerateContentConfig(
        system_instruction=instructions,
        temperature=0.1,
        max_output_tokens=100,
    )

    try:
        # Bound the whole model pool below the gateway's 60-second read timeout.
        async with asyncio.timeout(50), genai.Client(api_key=api_key, http_options=http_options).aio as client:
            for model in GEMINI_MODELS:
                try:
                    response = await client.models.generate_content(model=model, contents=text, config=config)
                    result = (response.text or "").strip()
                    if result:
                        return result
                except errors.APIError as error:
                    if error.code in (401, 403) or (error.code == 400 and "api key" in (error.message or "").lower()):
                        raise GeminiError("Gemini API key is invalid or has insufficient permissions.") from None
                    logger.warning("Gemini model %s returned HTTP %s", model, error.code)
                except Exception as error:
                    logger.warning("Gemini model %s failed (%s)", model, type(error).__name__)
    except GeminiError:
        raise
    except TimeoutError:
        logger.warning("Gemini editor request timed out")
        raise GeminiError("Gemini request timed out. Please try again.") from None
    except Exception as error:
        logger.warning("Gemini editor request failed (%s)", type(error).__name__)

    raise GeminiError("All Google models in the pool failed. Please try again later.")
