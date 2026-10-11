#!/usr/bin/env python3
"""Daily TryPost check and weekly content recommendation for Leadership MCP.

Reads only public post copy/status and saved channel analytics. It never publishes,
deletes, or changes social content; it writes reports for the next management decision.
"""
from __future__ import annotations
import json, os, urllib.parse, urllib.request
from datetime import datetime
from pathlib import Path

BASE = os.environ.get("TRYPOST_API_BASE_URL", "https://social.campello.me/api").rstrip("/")
TOKEN = os.environ.get("MCP_TRYPOST_API_KEY")
if not TOKEN:
    raise SystemExit("MCP_TRYPOST_API_KEY is not set")
ACCOUNT = "01a122e8-f9dc-71b1-acd7-57fa2131d02a"
ROOT = Path(os.environ.get("LEADERSHIP_MCP_ROOT", Path(__file__).resolve().parents[2]))
OUT = ROOT / "marketing" / "performance"
OUT.mkdir(parents=True, exist_ok=True)

if not TOKEN:
    raise SystemExit("MCP_TRYPOST_API_KEY is not set")

def get(path: str):
    req = urllib.request.Request(BASE + path, headers={
        "Authorization": "Bearer " + TOKEN,
        "Accept": "application/json",
        "User-Agent": "Hermes-LeadershipMCP-Performance/1.0",
    })
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))

def compact_post(p):
    return {
        "id": p.get("id"), "status": p.get("status"),
        "scheduled_at": p.get("scheduled_at"), "published_at": p.get("published_at"),
        "content": (p.get("content") or "")[:240],
        "media_count": len(p.get("media") or []),
        "facebook_status": [x.get("status") for x in p.get("platforms", [])
                            if x.get("platform") == "facebook" and x.get("enabled")],
    }

now = datetime.now().astimezone()
posts_response = get("/posts?" + urllib.parse.urlencode({"channels[]": ACCOUNT, "page": 1}))
posts = [compact_post(p) for p in posts_response.get("data", [])]
for post in posts:
    if post["status"] in {"published", "partially_published"} and post["id"]:
        try:
            post["metrics"] = get(f"/posts/{post['id']}/metrics")
        except Exception as exc:
            post["metrics_error"] = str(exc).splitlines()[0]
insights = None
insights_error = None
try:
    insights = get(f"/channels/{ACCOUNT}/insights?range=30d")
except Exception as exc:
    insights_error = str(exc).splitlines()[0]

published = [p for p in posts if p["status"] in {"published", "partially_published"}]
scheduled = [p for p in posts if p["status"] == "scheduled"]
drafts = [p for p in posts if p["status"] == "draft"]
issues = []
if any(p["media_count"] == 0 for p in scheduled):
    issues.append("Há publicação agendada sem mídia; não publicar até anexar uma imagem.")
if any(p["facebook_status"] == ["failed"] for p in posts):
    issues.append("Há publicação com falha no Facebook; revisar erro no TryPost.")

summary = (insights or {}).get("summary", {})
performance = (summary.get("performance") or []) if isinstance(summary, dict) else []
recommendations = [
    "Manter apenas posts estáticos/carrosséis nesta rodada.",
    "Priorizar o formato e o tema com mais compartilhamentos e salvamentos, não apenas reações.",
    "Se um post tiver comentários qualificados, responder manualmente em até 24 horas e transformar a pergunta em próximo carrossel.",
]
report = {
    "generated_at": now.isoformat(), "account": ACCOUNT,
    "counts": {"published": len(published), "scheduled": len(scheduled), "drafts": len(drafts)},
    "issues": issues, "posts": posts,
    "insights": insights,
    "insights_error": insights_error,
    "recommendations": recommendations,
}
(OUT / "latest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

lines = [f"# Performance Leadership MCP — {now.strftime('%Y-%m-%d %H:%M %Z')}", "",
         f"- Publicados: {len(published)}", f"- Agendados: {len(scheduled)}", f"- Drafts: {len(drafts)}", ""]
if issues:
    lines += ["## Alertas", *[f"- {x}" for x in issues], ""]
if insights_error:
    lines += [f"## Analytics", f"- Não disponível nesta execução: {insights_error}", ""]
else:
    available = (insights or {}).get("available_metrics", [])
    lines += ["## Analytics", f"- Métricas disponíveis: {', '.join(available) if available else 'nenhuma retornada'}", ""]
lines += ["## Decisão para o próximo lote", *[f"- {x}" for x in recommendations], "", "## Posts", ""]
for p in posts:
    lines.append(f"- `{p['status']}` · mídia {p['media_count']} · {p['content'].replace(chr(10), ' ')[:140]}")
(OUT / "latest.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(json.dumps({"gerado": str(OUT / "latest.md"), "publicados": len(published), "agendados": len(scheduled), "drafts": len(drafts), "alertas": issues, "analytics_disponivel": not bool(insights_error)}, ensure_ascii=False))
