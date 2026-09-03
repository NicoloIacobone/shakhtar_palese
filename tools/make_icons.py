#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_icons.py — genera TUTTE le immagini del marchio a partire dallo stemma
ufficiale, cioe' da un unico file sorgente:

    assets/img/logo-originale.png      (PNG con sfondo trasparente, piu' grande e' meglio e')

Si lancia cosi', dalla cartella del progetto:

    ./.venv/bin/python tools/make_icons.py

Cosa produce in assets/img/:
    logo.png            marchio piccolo di header e footer (canvas quadrato, trasparente)
    logo-grande.png     marchio del hero in home
    favicon-32.png      icona della scheda del browser
    apple-touch-icon.png icona quando salvi il sito sulla home di iPhone
    icon-192.png        icona dell'app installabile (manifest)
    icon-512.png        icona grande, usata anche come "maskable"
    og-cover.png        anteprima quando incolli il link su Instagram/WhatsApp

Rilancialo ogni volta che cambi lo stemma. Gli output vanno committati.
"""
from pathlib import Path
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Manca Pillow. Installalo con:  ./.venv/bin/pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
SORGENTE = IMG / "logo-originale.png"

SFONDO = (11, 11, 13)        # --nero della palette
ARANCIO = (255, 122, 26)     # --arancio
TESTO = (242, 242, 244)
TENUE = (163, 163, 173)

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


def carica_stemma():
    if not SORGENTE.exists():
        sys.exit(
            f"\n  Non trovo lo stemma: {SORGENTE.relative_to(ROOT)}\n\n"
            f"  Salva il logo (PNG, sfondo trasparente, il piu' grande che hai) in:\n"
            f"      {SORGENTE}\n\n"
            f"  poi rilancia questo script.\n"
        )
    im = Image.open(SORGENTE).convert("RGBA")
    # Ritaglio il bordo trasparente: cosi' lo stemma riempie davvero il riquadro
    # e non resta piccolo al centro per colpa di margini invisibili.
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    return im


def quadrato(stemma, lato, margine=0.06, sfondo=None):
    """Mette lo stemma al centro di un quadrato, mantenendone le proporzioni."""
    tela = Image.new("RGBA", (lato, lato), (sfondo + (255,)) if sfondo else (0, 0, 0, 0))
    utile = int(lato * (1 - 2 * margine))
    s = stemma.copy()
    s.thumbnail((utile, utile), Image.LANCZOS)
    tela.paste(s, ((lato - s.width) // 2, (lato - s.height) // 2), s)
    return tela


def salva(im, nome):
    percorso = IMG / nome
    im.save(percorso)
    kb = round(percorso.stat().st_size / 1024)
    print(f"  {percorso.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  ({kb} KB)")


def copertina_og(stemma):
    """1200x630: stemma a sinistra, testo a destra. E' l'anteprima dei link."""
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), SFONDO)
    d = ImageDraw.Draw(im)

    s = stemma.copy()
    s.thumbnail((470, 470), Image.LANCZOS)
    im.paste(s, (95, (H - s.height) // 2), s)

    x = 95 + 470 + 70
    d.text((x, 225), "Calcio amatoriale", font=font(58), fill=TESTO)
    d.text((x, 295), "Palese, Bari", font=font(58), fill=ARANCIO)
    d.text((x, 388), "Torneo Birra Peroni 2026", font=font(30), fill=TENUE)
    d.rectangle([0, H - 8, W, H], fill=ARANCIO)
    salva(im, "og-cover.png")


def main():
    stemma = carica_stemma()
    print(f"\nStemma sorgente: {SORGENTE.relative_to(ROOT)} "
          f"({stemma.width}x{stemma.height} dopo il ritaglio dei bordi trasparenti)\n")
    print("Genero:")

    # Marchio del sito: canvas quadrato e trasparente, cosi' nell'HTML basta
    # width=height e non serve conoscere le proporzioni dello stemma.
    salva(quadrato(stemma, 128, margine=0.0), "logo.png")
    salva(quadrato(stemma, 384, margine=0.0), "logo-grande.png")

    # Icone: sfondo pieno, perche' iOS e Android non gestiscono la trasparenza.
    salva(quadrato(stemma, 32, margine=0.02, sfondo=SFONDO).convert("RGB"), "favicon-32.png")
    salva(quadrato(stemma, 180, margine=0.10, sfondo=SFONDO).convert("RGB"), "apple-touch-icon.png")
    salva(quadrato(stemma, 192, margine=0.10, sfondo=SFONDO).convert("RGB"), "icon-192.png")
    # margine piu' largo: l'icona "maskable" viene ritagliata a cerchio da Android
    salva(quadrato(stemma, 512, margine=0.16, sfondo=SFONDO).convert("RGB"), "icon-512.png")

    copertina_og(stemma)

    # Il vecchio logo disegnato a mano non serve piu'.
    for vecchio in ("logo.svg", "favicon.svg"):
        f = IMG / vecchio
        if f.exists():
            f.unlink()
            print(f"  rimosso {f.relative_to(ROOT)} (sostituito dallo stemma vero)")
    print("\nFatto. Ricordati di committare assets/img/.")


if __name__ == "__main__":
    main()
