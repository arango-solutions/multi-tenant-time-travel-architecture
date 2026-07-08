"""
In-memory ArangoDB session storage for the frontend API.

Credentials are held server-side only. The browser receives an opaque session
identifier and sends it back in the X-Session-Id header.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import secrets
from typing import Dict, List, Optional

from arango import ArangoClient
from arango.database import StandardDatabase


SESSION_TTL_HOURS = 8


@dataclass
class ArangoSession:
    session_id: str
    endpoint: str
    username: str
    password: str
    expires_at: datetime
    database_name: Optional[str] = None

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at

    def touch(self) -> None:
        self.expires_at = _new_expiry()


class SessionStore:
    """Small in-memory session registry for local demo usage."""

    def __init__(self) -> None:
        self._sessions: Dict[str, ArangoSession] = {}

    def create_session(self, endpoint: str, username: str, password: str) -> ArangoSession:
        endpoint = _normalize_endpoint(endpoint)
        database = _connect(endpoint, "_system", username, password)
        database.version()

        session = ArangoSession(
            session_id=secrets.token_urlsafe(32),
            endpoint=endpoint,
            username=username,
            password=password,
            expires_at=_new_expiry(),
        )
        self._sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> ArangoSession:
        self.prune_expired()
        session = self._sessions.get(session_id)

        if session is None or session.is_expired:
            self._sessions.pop(session_id, None)
            raise KeyError("Session is missing or expired")

        session.touch()
        return session

    def delete_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def list_databases(self, session: ArangoSession) -> List[str]:
        database = _connect(session.endpoint, "_system", session.username, session.password)
        return sorted(database.databases())

    def set_database(self, session: ArangoSession, database_name: str) -> ArangoSession:
        database = _connect(session.endpoint, database_name, session.username, session.password)
        database.version()
        session.database_name = database_name
        session.touch()
        return session

    def get_database(self, session: ArangoSession) -> StandardDatabase:
        if not session.database_name:
            raise ValueError("No database selected")

        return _connect(session.endpoint, session.database_name, session.username, session.password)

    def prune_expired(self) -> None:
        expired_ids = [session_id for session_id, session in self._sessions.items() if session.is_expired]
        for session_id in expired_ids:
            self._sessions.pop(session_id, None)


def _connect(endpoint: str, database_name: str, username: str, password: str) -> StandardDatabase:
    client = ArangoClient(hosts=endpoint)
    return client.db(database_name, username=username, password=password)


def _new_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)


def _normalize_endpoint(endpoint: str) -> str:
    endpoint = endpoint.strip().rstrip("/")
    if not endpoint:
        raise ValueError("Endpoint is required")

    if not endpoint.startswith(("http://", "https://")):
        endpoint = f"https://{endpoint}"

    return endpoint
