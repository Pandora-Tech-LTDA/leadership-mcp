#!/usr/bin/env python3
"""Read-only health and funnel check for Leadership MCP.

Checks the public landing/cadastro/health routes, aggregates the privacy-minimal
usage JSONL log, and optionally aggregates registrations through `psql` when
DATABASE_URL is configured. It never publishes, sends messages, or prints
credentials or personal registration fields.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

DEFAULT_SITE = "https://leadership-mcp.campello.me"
ROOT = Path(os.environ.get("LEADERSHIP_MCP_ROOT", Path(__file__).resolve().parents[2]))
OUT = ROOT / "marketing" / "performance"


def fetch(base: str, path: str, timeout: int) -> dict:
    url = base.rstrip("/") + path
    req = urllib.request.Request(url, headers={"User-Agent": "LeadershipMCP-FunnelCheck/1.0"})
    started = datetime.now(timezone.utc)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = response.read(4096)
            return {
                "path": path,
                "ok": 200 <= response.status < 400,
                "status": response.status,
                "content_type": response.headers.get("content-type", ""),
                "bytes_sampled": len(body),
                "latency_ms": round((datetime.now(timezone.utc) - started).total_seconds() * 1000),
            }
    except urllib.error.HTTPError as exc:
        return {"path": path, "ok": False, "status": exc.code, "error": "http_error"}
    except Exception as exc:
        return {"path": path, "ok": False, "error": type(exc).__name__}


def read_usage(path: Path, since: datetime) -> dict:
    calls = 0
    users: set[str] = set()
    tools = Counter()
    triggers = Counter()
    malformed = 0
    if not path.exists():
        return {"available": False, "path": str(path), "reason": "file_not_found"}
    try:
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                try:
                    row = json.loads(line)
                    ts = datetime.fromisoformat(str(row.get("ts", "")).replace("Z", "+00:00"))
                    if ts < since:
                        continue
                    calls += 1
                    user = str(row.get("user") or "public")
                    users.add(user)
                    tools[str(row.get("tool") or "unknown")] += 1
                    triggers[str(row.get("gatilho") or "none")] += 1
                except (ValueError, TypeError, json.JSONDecodeError):
                    malformed += 1
    except OSError as exc:
        return {"available": False, "path": str(path), "reason": type(exc).__name__}
    return {
        "available": True,
        "path": str(path),
        "calls": calls,
        "active_users": len(users),
        "tools": dict(tools),
        "triggers": dict(triggers),
        "malformed_lines": malformed,
    }


def registration_summary() -> dict:
    """Use psql only for aggregate counts; never select names/emails/phone numbers."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return {"available": False, "reason": "DATABASE_URL_not_set"}
    if not shutil.which("psql"):
        return {"available": False, "reason": "psql_not_installed"}
    columns_query = """
      SELECT COALESCE(json_agg(column_name), '[]'::json)
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'registrations';
    """
    try:
        columns_result = subprocess.run(
            ["psql", database_url, "-X", "-q", "-t", "-A", "-c", columns_query],
            capture_output=True, text=True, timeout=30, check=False,
        )
    except Exception as exc:
        return {"available": False, "reason": type(exc).__name__}
    if columns_result.returncode != 0:
        return {"available": False, "reason": "database_query_failed"}
    try:
        columns = set(json.loads(columns_result.stdout.strip() or "[]"))
    except (json.JSONDecodeError, TypeError):
        return {"available": False, "reason": "database_response_invalid"}
    if not columns:
        return {"available": False, "reason": "registrations_table_not_found"}
    count_30d = "COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')" if "created_at" in columns else "NULL"
    with_utm = ("COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND COALESCE(utm_source,'') <> '')"
                if {"created_at", "utm_source"}.issubset(columns) else "NULL")
    consented = ("COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND consent_at IS NOT NULL)"
                 if {"created_at", "consent_at"}.issubset(columns) else "NULL")
    query = f"""
      SELECT json_build_object(
        'registrations_30d', {count_30d},
        'registrations_total', COUNT(*),
        'with_utm_30d', {with_utm},
        'consented_30d', {consented}
      ) FROM registrations;
    """
    result = subprocess.run(
        ["psql", database_url, "-X", "-q", "-t", "-A", "-c", query],
        capture_output=True, text=True, timeout=30, check=False,
    )
    if result.returncode != 0:
        return {"available": False, "reason": "database_query_failed"}
    try:
        return {"available": True, **json.loads(result.stdout.strip())}
    except (json.JSONDecodeError, TypeError):
        return {"available": False, "reason": "database_response_invalid"}


def render(report: dict) -> str:
    checks = report["checks"]
    usage = report["usage"]
    registrations = report["registrations"]
    lines = [
        f"# Leadership MCP — funnel check ({report['generated_at']})", "",
        f"- Site: `{report['site']}`",
        f"- Janela: últimos {report['window_days']} dias",
        f"- Status geral: **{'OK' if report['ok'] else 'ATENÇÃO'}**", "",
        "## Rotas", "",
        "| Rota | Status | Latência |",
        "|---|---:|---:|",
    ]
    for check in checks:
        status = check.get("status", check.get("error", "erro"))
        latency = f"{check['latency_ms']} ms" if "latency_ms" in check else "—"
        lines.append(f"| `{check['path']}` | `{status}` | {latency} |")
    lines += ["", "## Uso do MCP", ""]
    if usage.get("available"):
        lines += [f"- Chamadas: {usage['calls']}", f"- Usuários ativos: {usage['active_users']}", f"- Linhas inválidas: {usage['malformed_lines']}"]
        lines.append(f"- Ferramentas: `{json.dumps(usage['tools'], ensure_ascii=False)}`")
        lines.append(f"- Gatilhos: `{json.dumps(usage['triggers'], ensure_ascii=False)}`")
    else:
        lines.append(f"- Indisponível: `{usage.get('reason')}`")
    lines += ["", "## Cadastros", ""]
    if registrations.get("available"):
        lines += [f"- Cadastros nos últimos 30 dias: {registrations['registrations_30d']}", f"- Cadastros totais: {registrations['registrations_total']}", f"- Com UTM nos últimos 30 dias: {registrations['with_utm_30d']}", f"- Com consentimento nos últimos 30 dias: {registrations['consented_30d']}"]
    else:
        lines.append(f"- Indisponível: `{registrations.get('reason')}`")
    if report["alerts"]:
        lines += ["", "## Alertas", ""] + [f"- {alert}" for alert in report["alerts"]]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", default=os.environ.get("LEADERSHIP_MCP_SITE", DEFAULT_SITE))
    parser.add_argument("--usage-log", default=os.environ.get("LEADERSHIP_MCP_USAGE_LOG", str(ROOT / "server" / "data" / "usage.jsonl")))
    parser.add_argument("--window-days", type=int, default=7)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--strict", action="store_true", help="return exit 1 when a route fails")
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    checks = [fetch(args.site, path, args.timeout) for path in ("/health", "/", "/cadastro/")]
    alerts = []
    for check in checks:
        if not check["ok"]:
            alerts.append(f"Rota {check['path']} indisponível ({check.get('status', check.get('error'))}).")
    usage = read_usage(Path(args.usage_log), now - timedelta(days=max(args.window_days, 1)))
    registrations = registration_summary()
    if usage.get("available") and usage.get("malformed_lines", 0):
        alerts.append(f"O log de uso contém {usage['malformed_lines']} linha(s) inválida(s).")
    report = {
        "generated_at": now.isoformat(),
        "site": args.site,
        "window_days": args.window_days,
        "ok": not any(not check["ok"] for check in checks),
        "checks": checks,
        "usage": usage,
        "registrations": registrations,
        "alerts": alerts,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "funnel-latest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "funnel-latest.md").write_text(render(report), encoding="utf-8")
    print(json.dumps({"gerado": str(OUT / "funnel-latest.md"), "ok": report["ok"], "alertas": alerts, "uso_disponivel": usage.get("available", False), "cadastros_disponiveis": registrations.get("available", False)}, ensure_ascii=False))
    return 1 if args.strict and not report["ok"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
