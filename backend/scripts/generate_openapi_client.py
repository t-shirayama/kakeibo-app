from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from collections.abc import Iterable
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402


OUTPUT_PATH = ROOT / "frontend" / "src" / "lib" / "generated" / "openapi-client.ts"

OPERATIONS = [
    {"name": "login", "method": "post", "path": "/api/auth/login"},
    {"name": "get_settings", "method": "get", "path": "/api/settings"},
    {"name": "update_settings", "method": "put", "path": "/api/settings"},
    {"name": "delete_all_data", "method": "delete", "path": "/api/settings/data"},
    {"name": "export_user_data", "method": "post", "path": "/api/settings/export", "response_kind": "blob"},
    {"name": "list_transactions", "method": "get", "path": "/api/transactions"},
    {"name": "export_transactions", "method": "get", "path": "/api/transactions/export", "response_kind": "blob"},
    {"name": "create_transaction", "method": "post", "path": "/api/transactions"},
    {"name": "update_transaction", "method": "put", "path": "/api/transactions/{transaction_id}"},
    {"name": "count_same_shop_transactions", "method": "get", "path": "/api/transactions/{transaction_id}/same-shop-count"},
    {"name": "update_same_shop_category", "method": "patch", "path": "/api/transactions/{transaction_id}/same-shop-category"},
    {"name": "delete_transaction", "method": "delete", "path": "/api/transactions/{transaction_id}"},
    {"name": "list_categories", "method": "get", "path": "/api/categories"},
    {"name": "create_category", "method": "post", "path": "/api/categories"},
    {"name": "update_category", "method": "put", "path": "/api/categories/{category_id}"},
    {"name": "set_category_active", "method": "patch", "path": "/api/categories/{category_id}/status"},
    {"name": "delete_category", "method": "delete", "path": "/api/categories/{category_id}"},
    {"name": "list_income_settings", "method": "get", "path": "/api/income-settings"},
    {"name": "create_income_setting", "method": "post", "path": "/api/income-settings"},
    {"name": "update_income_setting", "method": "put", "path": "/api/income-settings/{income_setting_id}"},
    {"name": "delete_income_setting", "method": "delete", "path": "/api/income-settings/{income_setting_id}"},
    {"name": "upsert_income_override", "method": "put", "path": "/api/income-settings/{income_setting_id}/overrides/{target_month}"},
    {"name": "delete_income_override", "method": "delete", "path": "/api/income-settings/{income_setting_id}/overrides/{target_month}"},
    {"name": "list_uploads", "method": "get", "path": "/api/uploads"},
    {"name": "upload_pdf", "method": "post", "path": "/api/uploads"},
    {"name": "get_upload", "method": "get", "path": "/api/uploads/{upload_id}"},
    {"name": "delete_upload", "method": "delete", "path": "/api/uploads/{upload_id}"},
    {"name": "get_dashboard_summary", "method": "get", "path": "/api/dashboard/summary"},
    {"name": "get_recent_transactions", "method": "get", "path": "/api/dashboard/recent-transactions"},
    {"name": "list_category_summaries", "method": "get", "path": "/api/reports/categories"},
    {"name": "get_monthly_report", "method": "get", "path": "/api/reports/monthly"},
    {"name": "list_audit_logs", "method": "get", "path": "/api/audit-logs"},
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    openapi = app.openapi()
    output = render_client(openapi)
    if args.check:
        current = OUTPUT_PATH.read_text(encoding="utf-8") if OUTPUT_PATH.exists() else ""
        if current != output:
            print("Generated OpenAPI client is out of date.")
            raise SystemExit(1)
        return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(output, encoding="utf-8")


def render_client(openapi: dict[str, Any]) -> str:
    schemas = openapi.get("components", {}).get("schemas", {})
    schema_blocks = [render_schema_declaration(name, schema) for name, schema in sorted(schemas.items())]
    rendered_operations = [render_operation(openapi, spec) for spec in OPERATIONS]
    param_blocks = [block for block, _ in rendered_operations if block]
    operation_blocks = [block for _, block in rendered_operations]

    return """/* eslint-disable */
// This file is auto-generated from FastAPI OpenAPI. Do not edit by hand.

export type RequestConfig = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
};

export type GeneratedApiTransport = {
  requestJson<T>(config: RequestConfig): Promise<T>;
  requestBlob(config: RequestConfig): Promise<Blob>;
};

function appendQuery(path: string, params?: Record<string, unknown>) {
  if (!params) {
    return path;
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function toJsonBody(body: unknown) {
  return JSON.stringify(body);
}

""" + "\n\n".join(schema_blocks + param_blocks) + "\n\n" + """
export function createGeneratedApiClient(transport: GeneratedApiTransport) {
  return {
""" + ",\n".join(operation_blocks) + """
  };
}
"""


def render_operation(openapi: dict[str, Any], spec: dict[str, Any]) -> tuple[str, str]:
    path = spec["path"]
    method = spec["method"]
    operation = openapi["paths"][path][method]
    response_kind = spec.get("response_kind") or detect_response_kind(operation)
    params_type_name = f"{to_pascal_case(spec['name'])}Params"
    body_type = get_request_body_type(operation)
    multipart = is_multipart_request(operation)
    params_decl = render_params_type(params_type_name, operation)
    response_type = "Blob" if response_kind == "blob" else get_response_type(operation)

    path_params = [param["name"] for param in operation.get("parameters", []) if param.get("in") == "path"]
    query_params = [param["name"] for param in operation.get("parameters", []) if param.get("in") == "query"]
    interpolated_path = path
    for name in path_params:
        interpolated_path = interpolated_path.replace(f"{{{name}}}", f"${{params.{name}}}")
    path_expr = f"`{interpolated_path}`" if path_params else f'"{path}"'

    signature_parts: list[str] = []
    if path_params or query_params:
        default_value = " = {}" if not path_params else ""
        signature_parts.append(f"params: {params_type_name}{default_value}")
    if body_type:
        signature_parts.append(f"body: {body_type}")
    signature = ", ".join(signature_parts)

    query_arg = "undefined"
    if query_params:
        query_arg = "{ " + ", ".join(f"{name}: params.{name}" for name in query_params) + " }"
    path_value = path_expr if not query_params else f"appendQuery({path_expr}, {query_arg})"
    body_value = "body" if multipart else ("toJsonBody(body)" if body_type else "undefined")
    headers_value = "{}"
    if body_type and not multipart:
        headers_value = '{ "Content-Type": "application/json" }'
    request_method = "requestBlob" if response_kind == "blob" else "requestJson"
    if response_kind == "blob":
        request_line = f'transport.{request_method}({{ method: "{method.upper()}", path: {path_value}, body: {body_value}, headers: {headers_value} }})'
    else:
        request_line = f'transport.{request_method}<{response_type}>({{ method: "{method.upper()}", path: {path_value}, body: {body_value}, headers: {headers_value} }})'

    return params_decl, f"{spec['name']}: ({signature}) => {request_line}"


def render_params_type(type_name: str, operation: dict[str, Any]) -> str:
    params = [param for param in operation.get("parameters", []) if param.get("in") in {"path", "query"}]
    if not params:
        return ""
    lines = [f"export type {type_name} = {{"]
    required = {param["name"] for param in params if param.get("required")}
    for param in params:
        name = param["name"]
        ts_type = schema_to_ts(param.get("schema", {}))
        optional = "" if name in required else "?"
        lines.append(f"  {name}{optional}: {ts_type};")
    lines.append("};")
    return "\n".join(lines)


def detect_response_kind(operation: dict[str, Any]) -> str:
    responses = operation.get("responses", {})
    for key in ("200", "201"):
        content = responses.get(key, {}).get("content", {})
        if "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in content:
            return "blob"
    return "json"


def get_response_type(operation: dict[str, Any]) -> str:
    responses = operation.get("responses", {})
    for key in ("200", "201"):
        content = responses.get(key, {}).get("content", {})
        schema = next(iter(content.values()), {}).get("schema")
        if schema:
            return schema_to_ts(schema)
    return "unknown"


def get_request_body_type(operation: dict[str, Any]) -> str | None:
    request_body = operation.get("requestBody", {})
    content = request_body.get("content", {})
    if not content:
        return None
    if "multipart/form-data" in content:
        return "FormData"
    schema = next(iter(content.values())).get("schema")
    if not schema:
        return None
    return schema_to_ts(schema)


def is_multipart_request(operation: dict[str, Any]) -> bool:
    return "multipart/form-data" in operation.get("requestBody", {}).get("content", {})


def render_schema_declaration(name: str, schema: dict[str, Any]) -> str:
    return f"export type {sanitize_type_name(name)} = {schema_to_ts(schema)};"


def schema_to_ts(schema: dict[str, Any]) -> str:
    if not schema:
        return "unknown"
    if schema.get("nullable"):
        base_schema = {key: value for key, value in schema.items() if key != "nullable"}
        return union_types([schema_to_ts(base_schema), "null"])
    if "$ref" in schema:
        return sanitize_type_name(schema["$ref"].split("/")[-1])
    if "allOf" in schema:
        return " & ".join(schema_to_ts(item) for item in schema["allOf"])
    if "anyOf" in schema:
        return union_types(schema_to_ts(item) for item in schema["anyOf"])
    if "oneOf" in schema:
        return union_types(schema_to_ts(item) for item in schema["oneOf"])
    if "enum" in schema:
        return " | ".join(json.dumps(value, ensure_ascii=False) for value in schema["enum"])

    schema_type = schema.get("type")
    if schema_type == "null":
        return "null"
    if schema_type == "string":
        return "string"
    if schema_type in {"integer", "number"}:
        return "number"
    if schema_type == "boolean":
        return "boolean"
    if schema_type == "array":
        return f"Array<{schema_to_ts(schema.get('items', {}))}>"
    if schema_type == "object" or "properties" in schema:
        properties = schema.get("properties", {})
        required = set(schema.get("required", []))
        if not properties:
            additional = schema.get("additionalProperties")
            if isinstance(additional, dict):
                return f"Record<string, {schema_to_ts(additional)}>"
            return "Record<string, unknown>"
        lines = ["{"]
        for name, property_schema in properties.items():
            optional = "" if name in required else "?"
            lines.append(f"  {name}{optional}: {schema_to_ts(property_schema)};")
        lines.append("}")
        return "\n".join(lines)
    return "unknown"


def union_types(types: Iterable[str]) -> str:
    unique_types: list[str] = []
    for value in types:
        if value not in unique_types:
            unique_types.append(value)
    return " | ".join(unique_types)


def sanitize_type_name(value: str) -> str:
    value = re.sub(r"[^0-9A-Za-z_]", "_", value)
    if value and value[0].isdigit():
        value = f"_{value}"
    return value


def to_pascal_case(value: str) -> str:
    parts = re.split(r"[^0-9A-Za-z]+", value)
    return "".join(part[:1].upper() + part[1:] for part in parts if part)


if __name__ == "__main__":
    main()
