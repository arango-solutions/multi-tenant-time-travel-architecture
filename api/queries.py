"""
AQL queries and graph-shaping helpers for the temporal graph API.
"""

import re
from typing import Any, Dict, List, Optional

NEVER_EXPIRES = 9223372036854775807


SNAPSHOT_QUERY = """
LET devices = (
  FOR d IN Device
    FILTER d.tenantId IN @tenant_ids
      AND d.created <= @timestamp
      AND d.expired > @timestamp
    RETURN d
)

LET software = (
  FOR s IN Software
    FILTER s.tenantId IN @tenant_ids
      AND s.created <= @timestamp
      AND s.expired > @timestamp
    RETURN s
)

LET locations = (
  FOR l IN Location
    FILTER l.tenantId IN @tenant_ids
    RETURN l
)

LET alerts = (
  FOR a IN Alert
    FILTER a.tenantId IN @tenant_ids
      AND a.created <= @timestamp
      AND a.expired > @timestamp
    RETURN a
)

LET connections = (
  FOR e IN hasConnection
    FILTER e.tenantId IN @tenant_ids
    RETURN e
)

LET hasLocations = (
  FOR e IN hasLocation
    FILTER e.tenantId IN @tenant_ids
    RETURN e
)

LET hasDeviceSoftware = (
  FOR e IN hasDeviceSoftware
    FILTER e.tenantId IN @tenant_ids
    RETURN e
)

LET hasAlerts = (
  FOR e IN hasAlert
    FILTER e.tenantId IN @tenant_ids
      AND e.created <= @timestamp
      AND e.expired > @timestamp
    RETURN e
)

RETURN {
  devices: devices,
  software: software,
  locations: locations,
  alerts: alerts,
  connections: connections,
  hasLocations: hasLocations,
  hasDeviceSoftware: hasDeviceSoftware,
  hasAlerts: hasAlerts
}
"""


TIME_RANGE_QUERY = """
LET deviceCreated = (
  FOR d IN Device
    FILTER d.tenantId IN @tenant_ids
    RETURN d.created
)

LET softwareCreated = (
  FOR s IN Software
    FILTER s.tenantId IN @tenant_ids
    RETURN s.created
)

LET alertCreated = (
  FOR a IN Alert
    FILTER a.tenantId IN @tenant_ids
    RETURN a.created
)

LET currentDeviceCreated = (
  FOR d IN Device
    FILTER d.tenantId IN @tenant_ids AND d.expired == @never_expires
    RETURN d.created
)

LET currentSoftwareCreated = (
  FOR s IN Software
    FILTER s.tenantId IN @tenant_ids AND s.expired == @never_expires
    RETURN s.created
)

LET allCreated = APPEND(APPEND(deviceCreated, softwareCreated), alertCreated)
LET currentCreated = APPEND(currentDeviceCreated, currentSoftwareCreated)

RETURN {
  min: MIN(allCreated),
  max: MAX(allCreated),
  now: MAX(currentCreated)
}
"""


TENANTS_QUERY = """
LET deviceCreated = (
  FOR d IN Device
    FILTER d.tenantId != null AND d.created != null
    RETURN { tenantId: d.tenantId, created: d.created }
)

LET softwareCreated = (
  FOR s IN Software
    FILTER s.tenantId != null AND s.created != null
    RETURN { tenantId: s.tenantId, created: s.created }
)

LET alertCreated = (
  FOR a IN Alert
    FILTER a.tenantId != null AND a.created != null
    RETURN { tenantId: a.tenantId, created: a.created }
)

FOR row IN APPEND(APPEND(deviceCreated, softwareCreated), alertCreated)
  COLLECT tenantId = row.tenantId AGGREGATE createdAt = MIN(row.created)
  SORT createdAt, tenantId
  RETURN { tenantId: tenantId, createdAt: createdAt }
"""


def build_snapshot_graph(snapshot: Dict[str, List[Dict[str, Any]]], timestamp: float) -> Dict[str, Any]:
    """Convert raw ArangoDB documents into a force-graph friendly payload."""
    nodes: Dict[str, Dict[str, Any]] = {}
    links: List[Dict[str, Any]] = []

    for device in snapshot.get("devices", []):
        node_id = _logical_node_id("Device", device["_key"], _tenant_id(device))
        nodes[node_id] = _node(node_id, device, "device", _device_label(device), timestamp)

    for software in snapshot.get("software", []):
        node_id = _logical_node_id("Software", software["_key"], _tenant_id(software))
        nodes[node_id] = _node(node_id, software, "software", _software_label(software), timestamp)

    for location in snapshot.get("locations", []):
        node_id = _logical_node_id("Location", location["_key"], _tenant_id(location))
        nodes[node_id] = _node(node_id, location, "location", location.get("name", location["_key"]), timestamp)

    for alert in snapshot.get("alerts", []):
        node_id = _logical_node_id("Alert", alert["_key"], _tenant_id(alert))
        nodes[node_id] = _node(node_id, alert, "alert", alert.get("name", alert["_key"]), timestamp)

    _extend_links(links, snapshot.get("connections", []), nodes, "connection")
    _extend_links(links, snapshot.get("hasLocations", []), nodes, "location")
    _extend_links(links, snapshot.get("hasDeviceSoftware", []), nodes, "software")
    _extend_links(links, snapshot.get("hasAlerts", []), nodes, "alert")

    return {
        "timestamp": timestamp,
        "nodes": list(nodes.values()),
        "links": links,
        "edges": links,
        "counts": {
            "devices": len(snapshot.get("devices", [])),
            "software": len(snapshot.get("software", [])),
            "locations": len(snapshot.get("locations", [])),
            "alerts": len(snapshot.get("alerts", [])),
            "links": len(links),
        },
    }


def _node(
    node_id: str,
    document: Dict[str, Any],
    group: str,
    label: str,
    timestamp: float,
) -> Dict[str, Any]:
    return {
        "id": node_id,
        "label": label,
        "group": group,
        "tenantId": _tenant_id(document),
        "key": document.get("_key"),
        "arangoId": document.get("_id"),
        "created": document.get("created"),
        "expired": document.get("expired"),
        "activeAt": timestamp,
        "data": _clean_document(document),
    }


def _extend_links(
    links: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    nodes: Dict[str, Dict[str, Any]],
    relationship: str,
) -> None:
    for index, edge in enumerate(edges):
        tenant_id = _tenant_id(edge)
        source = _logical_node_id_from_ref(edge.get("_from"), tenant_id)
        target = _logical_node_id_from_ref(edge.get("_to"), tenant_id)

        if source is None or target is None:
            continue

        if source not in nodes or target not in nodes:
            continue

        links.append(
            {
                "id": f"t:{tenant_id}:{edge.get('_id') or f'{relationship}:{index}:{source}->{target}'}",
                "source": source,
                "target": target,
                "label": relationship,
                "relationship": relationship,
                "tenantId": tenant_id,
                "data": _clean_document(edge),
            }
        )


def _logical_node_id_from_ref(ref: Optional[str], tenant_id: str) -> Optional[str]:
    if not ref or "/" not in ref:
        return None

    collection, key = ref.split("/", 1)
    return _logical_node_id(collection, key, tenant_id)


def _logical_node_id(collection: str, key: str, tenant_id: str) -> str:
    if collection in {"Device", "DeviceProxyIn", "DeviceProxyOut"}:
        return f"t:{tenant_id}:device:{_strip_version_suffix(key)}"

    if collection in {"Software", "SoftwareProxyIn", "SoftwareProxyOut"}:
        return f"t:{tenant_id}:software:{_strip_version_suffix(key)}"

    if collection == "Location":
        return f"t:{tenant_id}:location:{key}"

    if collection == "Alert":
        return f"t:{tenant_id}:alert:{key}"

    return f"t:{tenant_id}:{collection}:{key}"


def _tenant_id(document: Dict[str, Any]) -> str:
    return str(document.get("tenantId") or "unknown")


def _strip_version_suffix(key: str) -> str:
    return re.sub(r"-\d+$", "", key)


def _device_label(device: Dict[str, Any]) -> str:
    return device.get("hostName") or device.get("name") or device["_key"]


def _software_label(software: Dict[str, Any]) -> str:
    name = software.get("name") or software["_key"]
    version = software.get("version")
    return f"{name} {version}" if version else name


def _clean_document(document: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in document.items() if not key.startswith("_rev")}
