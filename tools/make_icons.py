#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_icons.py — genera favicon, icone e immagine di copertina Open Graph
partendo dalla stessa geometria di assets/img/logo.svg (scudetto + S + macchie).

Si lancia UNA VOLTA SOLA (o quando cambi il logo):

    ./.venv/bin/python tools/make_icons.py

Gli output finiscono in assets/img/ e vanno committati nel repo.
Non serve nessuna libreria per leggere l'SVG: le forme sono ridisegnate qui
con Pillow, con le stesse coordinate su una griglia 0-128.
"""
from pathlib import Path
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Manca Pillow. Installalo con:  ./.venv/bin/pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"

ARANCIO = (255, 122, 26)
NERO_SCUDO = (15, 15, 16)
SFONDO = (11, 11, 13)

# Font di sistema macOS, in ordine di preferenza. Se non ne trova nessuno
# usa quello di default di Pillow (brutto ma non fa crashare lo script).
FONT_CANDIDATI = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
]


def font(dim):
    for p in FONT_CANDIDATI:
        try:
            return ImageFont.truetype(p, dim)
        except Exception:
            continue
    return ImageFont.load_default()


def bezier_cubica(p0, p1, p2, p3, passi=40):
    """Campiona una curva di Bezier cubica: Pillow non sa disegnarle da solo."""
    pts = []
    for i in range(passi + 1):
        t = i / passi
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def profilo_scudetto():
    """Stesso path dell'SVG: M64 6 L116 22 L116 66 C116 96 94 114 64 122 C34 114 12 96 12 66 L12 22 Z"""
    p = [(64, 6), (116, 22), (116, 66)]
    p += bezier_cubica((116, 66), (116, 96), (94, 114), (64, 122))[1:]
    p += bezier_cubica((64, 122), (34, 114), (12, 96), (12, 66))[1:]
    p += [(12, 22)]
    return p


def disegna_logo(lato, con_sfondo=None, margine=0.0):
    """Disegna lo stemma in un quadrato lato x lato. Supersampling 4x per i bordi lisci."""
    S = 4
    dim = lato * S
    im = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    if con_sfondo:
        im = Image.new("RGBA", (dim, dim), con_sfondo + (255,))
    d = ImageDraw.Draw(im)

    # scala: la griglia sorgente e' 0-128, con un eventuale margine percentuale
    k = (dim * (1 - 2 * margine)) / 128
    off = dim * margine
    sx = lambda x: off + x * k
    pt = lambda p: (sx(p[0]), sx(p[1]))

    scudo = [pt(p) for p in profilo_scudetto()]
    d.polygon(scudo, fill=NERO_SCUDO)
    d.line(scudo + [scudo[0]], fill=ARANCIO, width=max(1, int(6 * k)), joint="curve")

    # La S: due archi geometrici sovrapposti, come nell'SVG.
    sp = max(1, int(13 * k))
    for cx, cy, r, a0, a1 in ((64, 48, 21, 90, 315), (64, 72, 21, 270, 135)):
        box = [sx(cx - r), sx(cy - r), sx(cx + r), sx(cy + r)]
        d.arc(box, a0, a1, fill=ARANCIO, width=sp)

    # Accenno di ghepardo: tre macchie.
    for cx, cy, r in ((98, 86, 4), (88, 99, 3), (101, 72, 2.6)):
        d.ellipse([sx(cx - r), sx(cy - r), sx(cx + r), sx(cy + r)], fill=ARANCIO + (190,))

    return im.resize((lato, lato), Image.LANCZOS)


def salva(im, nome, sfondo=None):
    if sfondo is not None:
        base = Image.new("RGB", im.size, sfondo)
        base.paste(im, (0, 0), im)
        im = base
    percorso = IMG / nome
    im.save(percorso)
    print(f"  {percorso.relative_to(ROOT)}  ({im.size[0]}x{im.size[1]})")


def copertina_og():
    """Immagine 1200x630 per l'anteprima su Instagram, WhatsApp e Twitter."""
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), SFONDO)
    d = ImageDraw.Draw(im)

    # Macchie da ghepardo appena accennate sullo sfondo.
    for cx, cy, r in ((120, 90, 34), (1080, 120, 22), (980, 540, 40), (240, 560, 26), (1140, 330, 16)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(26, 19, 12))

    stemma = disegna_logo(300)
    im.paste(stemma, (90, (H - 300) // 2), stemma)

    x = 440
    d.text((x, 210), "SHAKHTAR", font=font(96), fill=(242, 242, 244))
    d.text((x, 300), "PALESE", font=font(96), fill=ARANCIO)
    d.text((x, 412), "Calcio amatoriale — Palese, Bari", font=font(34), fill=(163, 163, 173))
    d.text((x, 458), "Torneo Birra Peroni", font=font(34), fill=(110, 110, 121))

    d.rectangle([0, H - 8, W, H], fill=ARANCIO)
    salva(im, "og-cover.png")


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    print("Genero le icone in assets/img/:")
    salva(disegna_logo(32), "favicon-32.png", sfondo=SFONDO)
    # apple-touch-icon: iOS non gestisce la trasparenza, serve lo sfondo pieno.
    salva(disegna_logo(180, margine=0.08), "apple-touch-icon.png", sfondo=SFONDO)
    salva(disegna_logo(192, margine=0.08), "icon-192.png", sfondo=SFONDO)
    salva(disegna_logo(512, margine=0.12), "icon-512.png", sfondo=SFONDO)
    copertina_og()
    # favicon.svg = il logo cosi' com'e', per i browser moderni
    (IMG / "favicon.svg").write_text((IMG / "logo.svg").read_text(encoding="utf-8"), encoding="utf-8")
    print(f"  {(IMG / 'favicon.svg').relative_to(ROOT)}  (copia di logo.svg)")
    print("Fatto.")


if __name__ == "__main__":
    main()
