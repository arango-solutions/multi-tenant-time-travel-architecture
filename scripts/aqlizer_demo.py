#!/usr/bin/env python3
"""
AQLizer CLI Demo — call the ArangoDB AQLizer API from the command line.

Supports these subcommands:
  deploy    – Deploy a new AQLizer (Graph-RAG) service on the cluster
  health    – Verify the Graph-RAG service is running
  aqlize    – Natural-language → AQL (streamed via process_text_stream, mode=aqlizer)
  translate – Natural-language → AQL → execute → results (translate_query)
  ask       – General LLM chat (process_text_stream, default mode)

Credentials and the service ID are read from .env:
  ARANGO_ENDPOINT, ARANGO_USERNAME, ARANGO_PASSWORD,
  ARANGO_DATABASE, OPENAI_API_KEY, AQLIZER_SERVICE_ID

Usage examples:
  python scripts/aqlizer_demo.py deploy
  python scripts/aqlizer_demo.py health
  python scripts/aqlizer_demo.py aqlize  "Show all devices for tenant acme"
  python scripts/aqlizer_demo.py translate "How many devices does each tenant have?"
  python scripts/aqlizer_demo.py ask "What are the advantages of graph databases?"
"""

import argparse
import ast
import json
import logging
import os
import sys
import textwrap

import requests
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("aqlizer_demo")


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        log.error("Environment variable %s is not set — check your .env file", name)
        sys.exit(1)
    return value


def _base_url() -> str:
    endpoint = _require_env("ARANGO_ENDPOINT")
    return endpoint.rstrip("/")


def _get_config(require_service_id: bool = True):
    base = _base_url()
    username = _require_env("ARANGO_USERNAME")
    password = _require_env("ARANGO_PASSWORD")

    service_id = os.getenv("AQLIZER_SERVICE_ID", "").strip()
    if require_service_id and not service_id:
        log.error(
            "AQLIZER_SERVICE_ID is not set in .env.  "
            "Run 'python scripts/aqlizer_demo.py deploy' first to create a service."
        )
        sys.exit(1)

    return {
        "base_url": base,
        "username": username,
        "password": password,
        "service_id": service_id,
    }


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def obtain_jwt(base_url: str, username: str, password: str) -> str:
    """Obtain a JWT bearer token via the ArangoDB _open/auth endpoint."""
    url = f"{base_url}/_open/auth"
    log.info("Authenticating against %s …", url)
    resp = requests.post(
        url,
        json={"username": username, "password": password},
        timeout=15,
    )
    resp.raise_for_status()
    token = resp.json().get("jwt")
    if not token:
        log.error("Auth response did not contain a jwt field: %s", resp.text)
        sys.exit(1)
    log.info("JWT obtained successfully")
    return token


def _auth_headers(jwt: str) -> dict:
    return {
        "Authorization": f"Bearer {jwt}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# API wrappers
# ---------------------------------------------------------------------------

def _service_url(base_url: str, service_id: str, path: str) -> str:
    return f"{base_url}/graph-rag/{service_id}{path}"


def cmd_deploy(cfg: dict, jwt: str, model: str) -> None:
    """POST /_platform/acp/v1/graphrag — deploy a new AQLizer service."""
    db_name = _require_env("ARANGO_DATABASE")
    api_key = _require_env("OPENAI_API_KEY")

    url = f"{cfg['base_url']}/_platform/acp/v1/graphrag"
    payload = {
        "env": {
            "db_name": db_name,
            "chat_api_provider": "openai",
            "chat_api_key": api_key,
            "chat_model": model,
        }
    }

    print(f"Deploying AQLizer service on {cfg['base_url']} …")
    print(f"  database : {db_name}")
    print(f"  model    : {model}")
    resp = requests.post(
        url,
        headers=_auth_headers(jwt),
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()

    service_info = data.get("serviceInfo", data)
    full_id = service_info.get("serviceId", "")
    status = service_info.get("status", "UNKNOWN")
    short_id = full_id.replace("arangodb-graph-rag-", "") if full_id else full_id

    print(f"\nService deployed successfully!")
    print(f"  serviceId : {full_id}")
    print(f"  short ID  : {short_id}")
    print(f"  status    : {status}")
    print(f"\nSet this in your .env file:")
    print(f"  AQLIZER_SERVICE_ID={short_id}")


def cmd_health(cfg: dict, jwt: str) -> None:
    """GET /v1/health — check service status."""
    url = _service_url(cfg["base_url"], cfg["service_id"], "/v1/health")
    log.info("GET %s", url)
    resp = requests.get(url, headers=_auth_headers(jwt), timeout=15)
    if resp.status_code == 404:
        print(f"Service not found (404): {url}")
        print(f"\nThe service ID '{cfg['service_id']}' does not exist on this cluster.")
        print("Either:")
        print("  1. Deploy a new service:  python scripts/aqlizer_demo.py deploy")
        print("  2. Set the correct AQLIZER_SERVICE_ID in .env")
        sys.exit(1)
    resp.raise_for_status()
    data = resp.json()
    status = data.get("status", "UNKNOWN")
    if status == "SERVING":
        print(f"AQLizer service is healthy  (status: {status})")
    else:
        print(f"AQLizer service status: {status}")
        print(json.dumps(data, indent=2))


def _stream_text_deltas(resp: requests.Response) -> None:
    """Parse an NDJSON stream of textDelta events and print assembled text."""
    for line in resp.iter_lines(decode_unicode=True):
        if not line:
            continue
        try:
            obj = json.loads(line)
            delta = obj.get("result", {}).get("textDelta", "")
            if delta:
                sys.stdout.write(delta)
                sys.stdout.flush()
        except json.JSONDecodeError:
            sys.stdout.write(line)
            sys.stdout.flush()


def cmd_aqlize(cfg: dict, jwt: str, question: str) -> None:
    """POST /v1/process_text_stream with mode=aqlizer — stream AQL to stdout."""
    url = _service_url(cfg["base_url"], cfg["service_id"], "/v1/process_text_stream")
    payload = {"input_text": question, "mode": "aqlizer"}
    log.info("POST %s  (streaming, mode=aqlizer)", url)
    log.info("Question: %s", question)

    resp = requests.post(
        url,
        headers=_auth_headers(jwt),
        json=payload,
        stream=True,
        timeout=120,
    )
    resp.raise_for_status()

    print()
    _stream_text_deltas(resp)
    print()


def _extract_content(value: str) -> str:
    """Extract the content field from a LangChain-style stringified response.

    The translate_query API may return values like:
        content='actual text here' additional_kwargs={...} ...
    This helper extracts just the 'actual text here' portion.
    """
    if not isinstance(value, str):
        return str(value)
    if value.startswith("content='"):
        end = value.find("' additional_kwargs=")
        if end == -1:
            end = value.find("' response_metadata=")
        if end == -1:
            end = len(value)
        extracted = value[len("content='"):end]
        return extracted.replace("\\n", "\n")
    return value


def cmd_translate(cfg: dict, jwt: str, question: str, formats: list[str]) -> None:
    """POST /v1/translate_query — NL → AQL → execute against the database."""
    url = _service_url(cfg["base_url"], cfg["service_id"], "/v1/translate_query")
    payload = {
        "input_text": question,
        "options": {"output_formats": formats},
    }
    log.info("POST %s  (translate_query, formats=%s)", url, formats)
    log.info("Question: %s", question)

    resp = requests.post(
        url,
        headers=_auth_headers(jwt),
        json=payload,
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()

    nl_key = "nlResponse" if "nlResponse" in data else "nl_response"
    aql_key = "aqlQuery" if "aqlQuery" in data else "aql_query"
    result_key = "aqlResult" if "aqlResult" in data else "aql_result"

    print()
    if nl_key in data:
        print("--- Natural Language ---")
        print(_extract_content(data[nl_key]))
        print()
    if aql_key in data:
        print("--- Generated AQL ---")
        aql_text = _extract_content(data[aql_key])
        aql_text = aql_text.strip("`").removeprefix("aql").removeprefix("\n").strip()
        print(aql_text)
        print()
    if result_key in data:
        print("--- Query Results ---")
        raw = data[result_key]
        try:
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            print(json.dumps(parsed, indent=2))
        except (json.JSONDecodeError, TypeError):
            try:
                parsed = ast.literal_eval(raw) if isinstance(raw, str) else raw
                print(json.dumps(parsed, indent=2))
            except (ValueError, SyntaxError):
                print(raw)
        print()

    if not any(k in data for k in (nl_key, aql_key, result_key)):
        print(json.dumps(data, indent=2))


def cmd_ask(cfg: dict, jwt: str, question: str) -> None:
    """POST /v1/process_text_stream (default mode) — general LLM chat, streamed."""
    url = _service_url(cfg["base_url"], cfg["service_id"], "/v1/process_text_stream")
    payload = {"input_text": question}
    log.info("POST %s  (streaming, default mode)", url)
    log.info("Question: %s", question)

    resp = requests.post(
        url,
        headers=_auth_headers(jwt),
        json=payload,
        stream=True,
        timeout=120,
    )
    resp.raise_for_status()

    print()
    _stream_text_deltas(resp)
    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="aqlizer_demo",
        description="AQLizer CLI — call the ArangoDB AQLizer API from the command line.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            examples:
              %(prog)s deploy                                    # deploy new service
              %(prog)s deploy --model gpt-4o-mini                # deploy with specific model
              %(prog)s health                                    # check service status
              %(prog)s aqlize  "Show all devices for tenant acme"
              %(prog)s translate "How many devices does each tenant have?"
              %(prog)s translate --formats NL AQL "Find all routers"
              %(prog)s ask "What are the advantages of graph databases?"
        """),
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true",
        help="enable verbose / debug logging on stderr",
    )

    sub = parser.add_subparsers(dest="command", required=True)

    p_dep = sub.add_parser("deploy", help="deploy a new AQLizer service on the cluster")
    p_dep.add_argument(
        "--model", default="gpt-4o",
        help="LLM model for the service (default: gpt-4o)",
    )

    sub.add_parser("health", help="check AQLizer service health")

    p_aql = sub.add_parser("aqlize", help="natural language → AQL (streamed)")
    p_aql.add_argument("question", help="natural-language question or instruction")

    p_tr = sub.add_parser("translate", help="natural language → AQL → execute → results")
    p_tr.add_argument("question", help="natural-language question")
    p_tr.add_argument(
        "--formats", nargs="+", default=["NL", "AQL", "JSON"],
        choices=["NL", "AQL", "JSON"],
        help="output formats (default: NL AQL JSON)",
    )

    p_ask = sub.add_parser("ask", help="general LLM chat (streamed)")
    p_ask.add_argument("question", help="general question for the LLM")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.WARNING,
        format="%(levelname)s  %(message)s",
        stream=sys.stderr,
    )

    need_service_id = args.command != "deploy"
    cfg = _get_config(require_service_id=need_service_id)
    jwt = obtain_jwt(cfg["base_url"], cfg["username"], cfg["password"])

    if args.command == "deploy":
        cmd_deploy(cfg, jwt, args.model)
    elif args.command == "health":
        cmd_health(cfg, jwt)
    elif args.command == "aqlize":
        cmd_aqlize(cfg, jwt, args.question)
    elif args.command == "translate":
        cmd_translate(cfg, jwt, args.question, args.formats)
    elif args.command == "ask":
        cmd_ask(cfg, jwt, args.question)


if __name__ == "__main__":
    main()
