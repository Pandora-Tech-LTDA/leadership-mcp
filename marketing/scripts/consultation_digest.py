#!/usr/bin/env python3
"""Summarize Leadership MCP consultations by category.

Reads the local JSONL inbox and emits a concise Markdown report for a scheduled
routine. Raw consultation text stays on disk; only short examples are included
in the delivered digest.
"""
from __future__ import annotations

import argparse
import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(os.environ.get("LEADERSHIP_MCP_ROOT", Path(__file__).resolve().parents[2]))
DEFAULT_CANDIDATES = [
    Path(os.environ["LEADERSHIP_MCP_CONSULTATIONS_LOG"]) if os.environ.get("LEADERSHIP_MCP_CONSULTATIONS_LOG") else None,
    ROOT / "data" / "consultations.jsonl",
    ROOT / "server" / "data" / "consultations.jsonl",
    Path("/app/data/consultations.jsonl"),
]
DEFAULT_CANDIDATES = [path for path in DEFAULT_CANDIDATES if path]
DEFAULT_LOG = next((path for path in DEFAULT_CANDIDATES if path.exists()), DEFAULT_CANDIDATES[0])

LABELS = {
    "conflito": "Conflito",
    "relacionamento-pessoal": "Relacionamento pessoal",
    "decisao-com-impacto": "Decisão com impacto",
    "feedback": "Feedback",
    "relacionamento": "Relacionamento interno",
    "interacao-externa": "Interação externa",
    "divergencia-e-silencio": "Divergência e silêncio",
    "autoridade-informal": "Autoridade informal",
    "limites-e-carga": "Limites e carga",
    "none": "Sem categoria",
}


def read_consultations(path: Path, since: datetime) -> dict:
    categories: Counter[str] = Counter()
    examples: defaultdict[str, list[str]] = defaultdict(list)
    users: set[str] = set()
    total = 0
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
                    category = str(row.get("gatilho") or "none")
                    question = " ".join(str(row.get("situacao") or "").split())
                    categories[category] += 1
                    users.add(str(row.get("user") or "public"))
                    total += 1
                    if question and len(examples[category]) < 5:
                        examples[category].append(question[:180] + ("…" if len(question) > 180 else ""))
                except (ValueError, TypeError, json.JSONDecodeError):
                    malformed += 1
    except OSError as exc:
        return {"available": False, "path": str(path), "reason": type(exc).__name__}

    return {
        "available": True,
        "path": str(path),
        "consultations": total,
        "active_users": len(users),
        "categories": dict(categories),
        "examples": dict(examples),
        "malformed_lines": malformed,
    }


def render(report: dict) -> str:
    data = report["consultations"]
    lines = [
        f"# Leadership MCP — consultas ({report['generated_at']})",
        "",
        f"- Janela: últimos {report['window_days']} dias",
        f"- Arquivo: `{report['path']}`",
    ]
    if not data.get("available"):
        lines += ["", f"**Caixa indisponível:** `{data.get('reason')}`", ""]
        return "\n".join(lines)

    lines += [
        f"- Consultas: {data['consultations']}",
        f"- Usuários: {data['active_users']}",
        f"- Linhas inválidas: {data['malformed_lines']}",
        "",
        "## Consultas por categoria",
        "",
    ]
    if not data["categories"]:
        lines.append("Nenhuma consulta no período.")
        return "\n".join(lines) + "\n"

    for category, count in sorted(data["categories"].items(), key=lambda item: (-item[1], item[0])):
        label = LABELS.get(category, category)
        lines.append(f"### {label} — {count}")
        for example in data["examples"].get(category, []):
            lines.append(f"- {example}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--consultations-log", default=os.environ.get("LEADERSHIP_MCP_CONSULTATIONS_LOG", str(DEFAULT_LOG)))
    parser.add_argument("--window-days", type=int, default=1)
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    data = read_consultations(Path(args.consultations_log), now - timedelta(days=max(args.window_days, 1)))
    report = {
        "generated_at": now.isoformat(),
        "window_days": args.window_days,
        "path": args.consultations_log,
        "consultations": data,
    }
    print(render(report), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
