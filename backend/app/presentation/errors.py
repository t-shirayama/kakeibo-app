from __future__ import annotations

from collections.abc import Awaitable, Callable
from http import HTTPStatus
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        apply_security_headers(response)
        return response


def apply_security_headers(response: Response) -> None:
    response.headers.setdefault("x-content-type-options", "nosniff")
    response.headers.setdefault("cross-origin-resource-policy", "same-origin")


def error_response(
    *,
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: object | None = None,
) -> JSONResponse:
    response = JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": jsonable_encoder(details),
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )
    apply_security_headers(response)
    return response


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    status_phrase = HTTPStatus(exc.status_code).phrase if exc.status_code in HTTPStatus._value2member_map_ else "Error"
    return error_response(
        request=request,
        status_code=exc.status_code,
        code=f"http_{exc.status_code}",
        message=str(exc.detail or status_phrase),
    )


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    status_phrase = HTTPStatus(exc.status_code).phrase if exc.status_code in HTTPStatus._value2member_map_ else "Error"
    return error_response(
        request=request,
        status_code=exc.status_code,
        code=f"http_{exc.status_code}",
        message=str(exc.detail or status_phrase),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response(
        request=request,
        status_code=422,
        code="validation_error",
        message="Request validation failed.",
        details=exc.errors(),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return error_response(
        request=request,
        status_code=500,
        code="internal_server_error",
        message="Internal server error.",
    )


def install_error_handlers(app: FastAPI) -> None:
    app.add_middleware(RequestIdMiddleware)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
