from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from app.api.routes import router as editor_router
from app.shared.exceptions import validation_exception_handler

app = FastAPI(title="AI Editor Service")
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.include_router(editor_router)


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok"}
