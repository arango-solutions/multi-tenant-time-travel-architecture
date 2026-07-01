"""
FastAPI entrypoint for the interactive temporal graph frontend.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from arango.database import StandardDatabase
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.queries import NEVER_EXPIRES, SNAPSHOT_QUERY, TENANTS_QUERY, TIME_RANGE_QUERY, build_snapshot_graph
from api.session_store import ArangoSession, SessionStore

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TENANT_REGISTRY_PATH = PROJECT_ROOT / "data" / "tenant_registry_time_travel.json"

DEFAULT_TIME_RANGE = {
    "min": 1780774934,
    "max": 1783021262,
    "now": 1782934934,
}


class LoginRequest(BaseModel):
    endpoint: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    sessionId: str
    endpoint: str
    username: str


class DatabaseSelectionRequest(BaseModel):
    databaseName: str = Field(..., min_length=1)


class TemporalGraphService:
    """Database-backed graph query service."""

    def list_tenants(self, database: StandardDatabase) -> List[Dict[str, Any]]:
        registry = _load_tenant_registry()
        tenant_ids = _execute_aql(database, TENANTS_QUERY)

        if not tenant_ids:
            tenant_ids = sorted(registry.keys())

        return [
            {
                "id": tenant_id,
                "name": registry.get(tenant_id, {}).get("tenantName", tenant_id),
                "description": registry.get(tenant_id, {}).get("tenantDescription", ""),
                "scaleFactor": registry.get(tenant_id, {}).get("scaleFactor"),
            }
            for tenant_id in tenant_ids
            if tenant_id != "shared_taxonomy"
        ]

    def get_time_range(self, database: StandardDatabase, tenant_id: str) -> Dict[str, float]:
        results = _execute_aql(
            database,
            TIME_RANGE_QUERY,
            {"tenant_id": tenant_id, "never_expires": NEVER_EXPIRES},
        )

        if not results:
            return DEFAULT_TIME_RANGE.copy()

        row = results[0]
        return {
            "min": float(row.get("min") or DEFAULT_TIME_RANGE["min"]),
            "max": float(row.get("max") or DEFAULT_TIME_RANGE["max"]),
            "now": float(row.get("now") or row.get("max") or DEFAULT_TIME_RANGE["now"]),
        }

    def get_snapshot_graph(self, database: StandardDatabase, tenant_id: str, timestamp: float) -> Dict[str, Any]:
        results = _execute_aql(
            database,
            SNAPSHOT_QUERY,
            {"tenant_id": tenant_id, "timestamp": timestamp},
        )

        if not results:
            raise HTTPException(status_code=404, detail=f"No graph data found for tenant {tenant_id}")

        return build_snapshot_graph(results[0], timestamp)


app = FastAPI(
    title="Temporal Graph API",
    description="Point-in-time graph snapshots for the multi-tenant ArangoDB time-travel demo.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_store = SessionStore()
graph_service = TemporalGraphService()


def _get_session(x_session_id: str = Header(..., alias="X-Session-Id")) -> ArangoSession:
    try:
        return session_store.get_session(x_session_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing, invalid, or expired session. Please log in again.",
        ) from exc


def _get_selected_database(session: ArangoSession) -> StandardDatabase:
    try:
        return session_store.get_database(session)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select a database before querying tenants or graph data.",
        ) from exc


def _execute_aql(database: StandardDatabase, query: str, bind_vars: Optional[Dict[str, Any]] = None) -> List[Any]:
    try:
        return list(database.aql.execute(query, bind_vars=bind_vars or {}))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AQL query failed: {exc}") from exc


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"ok": True}


@app.post("/api/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    try:
        session = session_store.create_session(payload.endpoint, payload.username, payload.password)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unable to authenticate with ArangoDB: {exc}",
        ) from exc

    return LoginResponse(sessionId=session.session_id, endpoint=session.endpoint, username=session.username)


@app.post("/api/logout")
def logout(session: ArangoSession = Depends(_get_session)) -> Dict[str, bool]:
    session_store.delete_session(session.session_id)
    return {"ok": True}


@app.get("/api/databases")
def list_databases(session: ArangoSession = Depends(_get_session)) -> List[str]:
    try:
        return session_store.list_databases(session)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unable to list databases for this account: {exc}",
        ) from exc


@app.post("/api/database")
def select_database(
    payload: DatabaseSelectionRequest,
    session: ArangoSession = Depends(_get_session),
) -> Dict[str, str]:
    try:
        session_store.set_database(session, payload.databaseName)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to select database '{payload.databaseName}': {exc}",
        ) from exc

    return {"databaseName": payload.databaseName}


@app.get("/api/tenants")
def list_tenants(session: ArangoSession = Depends(_get_session)) -> List[Dict[str, Any]]:
    database = _get_selected_database(session)
    tenants = graph_service.list_tenants(database)

    if not tenants:
        raise HTTPException(status_code=404, detail="No tenants found")

    return tenants


@app.get("/api/time-range")
def get_time_range(
    tenant: str = Query(..., min_length=1),
    session: ArangoSession = Depends(_get_session),
) -> Dict[str, float]:
    database = _get_selected_database(session)
    return graph_service.get_time_range(database, tenant)


@app.get("/api/graph")
def get_graph(
    tenant: str = Query(..., min_length=1),
    t: float = Query(..., description="Unix timestamp in seconds"),
    session: ArangoSession = Depends(_get_session),
) -> Dict[str, Any]:
    database = _get_selected_database(session)
    return graph_service.get_snapshot_graph(database, tenant, t)


def _load_tenant_registry() -> Dict[str, Dict[str, Any]]:
    if not TENANT_REGISTRY_PATH.exists():
        return {}

    with TENANT_REGISTRY_PATH.open("r", encoding="utf-8") as registry_file:
        registry = json.load(registry_file)

    return registry.get("tenants", {})
