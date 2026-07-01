"""
FastAPI entrypoint for the interactive temporal graph frontend.
"""

import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from api.queries import NEVER_EXPIRES, SNAPSHOT_QUERY, TENANTS_QUERY, TIME_RANGE_QUERY, build_snapshot_graph
from src.database.database_utilities import DatabaseMixin

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TENANT_REGISTRY_PATH = PROJECT_ROOT / "data" / "tenant_registry_time_travel.json"

DEFAULT_TIME_RANGE = {
    "min": 1780774934,
    "max": 1783021262,
    "now": 1782934934,
}


class TemporalGraphService(DatabaseMixin):
    """Database-backed graph query service."""

    def list_tenants(self) -> List[Dict[str, Any]]:
        registry = _load_tenant_registry()
        tenant_ids = self.execute_aql(TENANTS_QUERY)

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

    def get_time_range(self, tenant_id: str) -> Dict[str, float]:
        results = self.execute_aql(
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

    def get_snapshot_graph(self, tenant_id: str, timestamp: float) -> Dict[str, Any]:
        results = self.execute_aql(
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

service = TemporalGraphService()


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"ok": service.connect_to_database()}


@app.get("/api/tenants")
def list_tenants() -> List[Dict[str, Any]]:
    tenants = service.list_tenants()

    if not tenants:
        raise HTTPException(status_code=404, detail="No tenants found")

    return tenants


@app.get("/api/time-range")
def get_time_range(tenant: str = Query(..., min_length=1)) -> Dict[str, float]:
    return service.get_time_range(tenant)


@app.get("/api/graph")
def get_graph(
    tenant: str = Query(..., min_length=1),
    t: float = Query(..., description="Unix timestamp in seconds"),
) -> Dict[str, Any]:
    return service.get_snapshot_graph(tenant, t)


def _load_tenant_registry() -> Dict[str, Dict[str, Any]]:
    if not TENANT_REGISTRY_PATH.exists():
        return {}

    with TENANT_REGISTRY_PATH.open("r", encoding="utf-8") as registry_file:
        registry = json.load(registry_file)

    return registry.get("tenants", {})
