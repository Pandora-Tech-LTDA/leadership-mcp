#!/usr/bin/env python3
"""Gera a marca v2 (cavalo da ilustração aprovada) e as capas do Facebook v2.

Saída em marketing/assets/v2/. Os SVGs usam Instrument Sans + Fraunces (Google Fonts);
os PNGs são renderizados no navegador a partir destes mesmos SVGs.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "v2"

INK, GREEN, BEIGE, SOFT, CORAL, MUTED, LINE = (
    "#1c2530", "#2f6f5b", "#faf8f4", "#e7f0ec", "#c65f3f", "#5b6875", "#e6e3dc")

FONTS = ("@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700"
         "&amp;family=Fraunces:ital,opsz,wght@1,9..144,500&amp;display=block');")
SANS = "'Instrument Sans', Arial, Helvetica, sans-serif"
SERIF = "Fraunces, Georgia, 'Times New Roman', serif"

# Cavalo de xadrez geométrico, voltado para a esquerda, numa caixa 0–100.
# Silhueta = cabeça/pescoço + colar + base. Detalhes (crina, boca) são "cortes"
# na cor do fundo, para o símbolo funcionar em uma única cor.
KNIGHT_HEAD = ("M31 83 Q32 72 38 66 L21 60 L13 53 L14 45 L26 33 L33 22 L37 9 L46 18 "
               "L55 17 Q73 24 78 45 Q81 66 71 83 Z")
KNIGHT_COLLAR = "M27 83 H79 V88 H27 Z"
KNIGHT_BASE = "M20 89 H86 Q88 89 88 91 V95 Q88 97 86 97 H20 Q18 97 18 95 V91 Q18 89 20 89 Z"
KNIGHT_MANE = "M51 25 Q66 36 64 64"
KNIGHT_MOUTH = "M14 50 L23 52"
KNIGHT_BOX = (13, 9, 88, 97)  # bbox aproximado da silhueta


import base64
import itertools

_KNIGHT_PNG = Path(__file__).resolve().parent.parent / "assets" / "v2" / "LMCP_knight_source.png"
_KNIGHT_URI = "data:image/png;base64," + base64.b64encode(_KNIGHT_PNG.read_bytes()).decode()
_KNIGHT_SRC = 1024                    # PNG quadrado: traço branco sobre preto
_KNIGHT_BBOX = (282, 128, 744, 894)   # área desenhada dentro do PNG
_ids = itertools.count(1)


def knight(cx, cy, h, fill, cut=None, eye=None, mane=True):
    """Cavalo da ilustração aprovada, usada como máscara de luminância:
    o traço branco vira `fill` e o preto fica transparente (assume a cor do fundo)."""
    x0, y0, x1, y1 = _KNIGHT_BBOX
    s = h / (y1 - y0)
    size = _KNIGHT_SRC * s
    ix = cx - s * (x0 + x1) / 2
    iy = cy - s * (y0 + y1) / 2
    mid = f"kn{next(_ids)}"
    return (f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="{ix:.1f}" y="{iy:.1f}" '
            f'width="{size:.1f}" height="{size:.1f}">'
            f'<image href="{_KNIGHT_URI}" x="{ix:.1f}" y="{iy:.1f}" width="{size:.1f}" height="{size:.1f}"/>'
            f'</mask><rect x="{ix:.1f}" y="{iy:.1f}" width="{size:.1f}" height="{size:.1f}" '
            f'fill="{fill}" mask="url(#{mid})"/>')


def svg(w, h, body, title, desc, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'role="img" aria-labelledby="t d"><title id="t">{title}</title><desc id="d">{desc}</desc>'
            f'<defs><style>{FONTS}</style>{defs}</defs>{body}</svg>\n')


GRAIN = ('<filter id="grain" x="0" y="0" width="100%" height="100%">'
         '<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>'
         '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter>')


def grain(w, h, op):
    return f'<rect width="{w}" height="{h}" filter="url(#grain)" opacity="{op}"/>'


def chessboard(x, y, cols, rows, size, color, op, fade_id=None):
    cells = []
    for r in range(rows):
        for c in range(cols):
            if (r + c) % 2 == 0:
                cells.append(f'<rect x="{x + c * size}" y="{y + r * size}" width="{size}" height="{size}"/>')
    mask = f' mask="url(#{fade_id})"' if fade_id else ""
    return f'<g fill="{color}" opacity="{op}"{mask}>{"".join(cells)}</g>'


def lockup(x, y, tile_fill, knight_fill, text_fill, cut):
    """Assinatura: mini símbolo + 'Leadership MCP'."""
    return (f'<rect x="{x}" y="{y}" width="44" height="44" rx="11" fill="{tile_fill}"/>'
            + knight(x + 22, y + 22, 30, knight_fill, cut)
            + f'<text x="{x + 60}" y="{y + 30}" fill="{text_fill}" font-family="{SANS}" font-size="24" '
              f'font-weight="700" letter-spacing=".5">Leadership MCP</text>')


def card(x, y, surface, ink, muted, line):
    """Recorte do momento do produto: o assistente pausa e pergunta."""
    w, h = 444, 146
    return (
        f'<g filter="url(#shadow)"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" fill="{surface}"/></g>'
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" fill="none" stroke="{line}"/>'
        f'<circle cx="{x + 30}" cy="{y + 33}" r="5" fill="{CORAL}"/>'
        f'<text x="{x + 46}" y="{y + 39}" fill="{muted}" font-family="{SANS}" font-size="17" font-weight="600" '
        f'letter-spacing="1.5">ANTES DE ENVIAR</text>'
        f'<text x="{x + 24}" y="{y + 76}" fill="{ink}" font-family="{SANS}" font-size="22" font-weight="500">'
        f'Parece uma conversa difícil. Quer</text>'
        f'<text x="{x + 24}" y="{y + 104}" fill="{ink}" font-family="{SANS}" font-size="22" font-weight="500">'
        f'consultar a base antes de responder?</text>'
    )


SHADOW = ('<filter id="shadow" x="-20%" y="-30%" width="140%" height="170%">'
          '<feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#1c2530" flood-opacity=".18"/></filter>')


def headline(x, y, sans_fill, serif_fill, sub_fill, url_fill, rule):
    return (
        f'<text x="{x}" y="{y}" fill="{sans_fill}" font-family="{SANS}" font-size="78" font-weight="700" '
        f'letter-spacing="-1.5">Liderança no</text>'
        f'<text x="{x - 4}" y="{y + 96}" fill="{serif_fill}" font-family="{SERIF}" font-size="92" '
        f'font-style="italic" font-weight="500" letter-spacing="-1">momento da verdade<tspan fill="{CORAL}">.</tspan></text>'
        f'<text x="{x}" y="{y + 172}" fill="{sub_fill}" font-family="{SANS}" font-size="30">'
        f'Seu assistente percebe a conversa difícil.</text>'
        f'<text x="{x}" y="{y + 214}" fill="{sub_fill}" font-family="{SANS}" font-size="30">'
        f'Você decide como responder.</text>'
        f'<line x1="{x}" y1="{y + 268}" x2="{x + 56}" y2="{y + 268}" stroke="{rule}" stroke-width="3" stroke-linecap="round"/>'
        f'<text x="{x + 76}" y="{y + 277}" fill="{url_fill}" font-family="{SANS}" font-size="26" font-weight="700">'
        f'leadership-mcp.campello.me</text>'
    )


W, H = 1640, 856
FADE = ('<radialGradient id="fg" cx=".55" cy=".45" r=".7"><stop offset="0" stop-color="#fff"/>'
        '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
        '<mask id="fade"><rect width="1640" height="856" fill="url(#fg)"/></mask>')


def cover_light():
    body = [
        f'<rect width="{W}" height="{H}" fill="{BEIGE}"/>',
        f'<rect x="1040" y="0" width="600" height="{H}" fill="{GREEN}"/>',
        f'<g transform="translate(1040 0)">' + chessboard(0, -22, 6, 9, 100, "#ffffff", .05) + "</g>",
        knight(1360, 380, 430, BEIGE, GREEN),
        card(930, 584, "#ffffff", INK, MUTED, LINE),
        lockup(140, 150, GREEN, BEIGE, INK, GREEN),
        headline(140, 318, INK, GREEN, MUTED, GREEN, CORAL),
        grain(W, H, .06),
    ]
    return svg(W, H, "".join(body), "Leadership MCP — capa clara",
               "Título 'Liderança no momento da verdade' sobre bege; à direita, cavalo de xadrez bege "
               "sobre painel verde com tabuleiro sutil e um cartão em que o assistente pergunta antes de responder.",
               GRAIN + SHADOW)


def cover_dark():
    body = [
        f'<rect width="{W}" height="{H}" fill="{INK}"/>',
        chessboard(860, -22, 8, 9, 100, "#ffffff", .045, "fade"),
        f'<circle cx="1330" cy="400" r="300" fill="{GREEN}" opacity=".55"/>',
        knight(1330, 392, 470, BEIGE, INK),
        card(950, 590, BEIGE, INK, MUTED, LINE),
        lockup(140, 150, GREEN, BEIGE, BEIGE, GREEN),
        headline(140, 318, BEIGE, "#9cc7b4", "#b8c2cc", BEIGE, CORAL),
        grain(W, H, .08),
    ]
    return svg(W, H, "".join(body), "Leadership MCP — capa escura",
               "Título em bege e verde claro sobre fundo ink; à direita, cavalo de xadrez bege sobre círculo verde "
               "e tabuleiro esmaecido, com cartão do assistente perguntando antes de responder.",
               GRAIN + SHADOW + FADE)


def cover_green():
    body = [
        f'<rect width="{W}" height="{H}" fill="{GREEN}"/>',
        chessboard(820, -22, 9, 9, 100, INK, .10, "fade"),
        knight(1300, 470, 760, INK, GREEN, eye=CORAL),
        lockup(140, 150, BEIGE, GREEN, BEIGE, BEIGE),
        headline(140, 318, BEIGE, SOFT, "#d4e6dd", BEIGE, CORAL),
        grain(W, H, .08),
    ]
    return svg(W, H, "".join(body), "Leadership MCP — capa verde",
               "Fundo verde da marca com grande cavalo de xadrez em ink à direita, sobre tabuleiro esmaecido; "
               "título 'Liderança no momento da verdade' em bege.",
               GRAIN + FADE)


def mark(size=512, bg=GREEN, fg=BEIGE, rounded=True):
    r = size * 0.22 if rounded else 0
    body = (f'<rect width="{size}" height="{size}" rx="{r:.0f}" fill="{bg}"/>'
            + knight(size / 2, size / 2 + size * 0.01, size * 0.62, fg, bg))
    return svg(size, size, body, "Leadership MCP — símbolo",
               "Cavalo de xadrez geométrico, voltado para a esquerda, com olho coral.")


def profile(size=512):
    # Facebook recorta em círculo: o cavalo fica dentro de ~62% do lado.
    body = (f'<rect width="{size}" height="{size}" fill="{GREEN}"/>'
            f'<circle cx="{size/2}" cy="{size/2}" r="{size*0.40}" fill="#2a6452"/>'
            + knight(size / 2, size / 2 + 6, size * 0.56, BEIGE, GREEN))
    return svg(size, size, body, "Leadership MCP — foto de perfil",
               "Cavalo de xadrez bege sobre verde, centralizado para recorte circular.")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "LMCP_mark_v2.svg": mark(),
        "LMCP_mark_v2_mono-ink.svg": mark(bg=BEIGE, fg=INK),
        "LMCP_profile_v2.svg": profile(),
        "LMCP_cover_v2_a-clara.svg": cover_light(),
        "LMCP_cover_v2_b-escura.svg": cover_dark(),
        "LMCP_cover_v2_c-verde.svg": cover_green(),
    }
    for name, content in files.items():
        (OUT / name).write_text(content, encoding="utf-8")
        print(OUT / name)


if __name__ == "__main__":
    main()
