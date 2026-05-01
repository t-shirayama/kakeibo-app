from fastapi import FastAPI

from app.presentation.errors import install_error_handlers
from app.presentation.api.router import api_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Kakeibo API",
        version="0.1.0",
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )
    install_error_handlers(app)
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
