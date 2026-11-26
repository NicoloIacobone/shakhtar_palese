#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_media.py — legge dal Google Drive della squadra dove stanno highlights e
foto di ogni partita e scrive gli indirizzi in data/media.json. Il sito li
mostra come due link, "Highlights" e "Foto", sotto la scheda di ogni partita
giocata (pagina Partite e home).

Come e' fatto il Drive (cartella pubblica, la leggiamo e basta: non si tocca)

    https://drive.google.com/drive/folders/1pXU0WKECCFAbYGPn5olYiSYhgh5YjsBY
      1_BIRRA_PERONI/          una cartella per partita
        HIGHLIGHTS/            -> link "Highlights"
        FOTO_BELLE/            -> link "Foto"
        (altre cartelle e file sciolti: ignorati)
      2_BIRRA_PERONI/ ...
      0_POST_SOCIAL/, 95_GRUPPO/, MAGLIE/ ...   ignorate

Il numero N della cartella e' la giornata del calendario del torneo, non
l'ordine in cui le partite sono state giocate: 1-5 sono il 1º girone di
andata, 6-10 il 1º girone di ritorno, 11-15 il 2º di andata, 16-20 il 2º di
ritorno. La regola non e' scritta qui partita per partita: si ricava dagli id
di tornei.json (bp26-a1g3 = 1º girone di andata, giornata 3), mettendo i
gironi in fila (a1, r1, a2, r2...) e contando quante giornate ha ognuno.
Esempio: la cartella 8 e' bp26-r1g3.

Come si legge il Drive senza chiavi
  https://drive.google.com/embeddedfolderview?id=<id cartella> restituisce
  l'elenco di una cartella pubblica in HTML. NON e' un servizio documentato da
  Google: se un giorno cambia, questo script se ne accorge (non trova piu' i
  pezzi che si aspetta), avvisa e NON scrive niente. Il sito tiene i link che
  aveva. Anche se il Drive non risponde, lo script esce senza errore, cosi' il
  workflow che lo lancia va avanti con il resto.

Cosa scrive
  data/media.json, con un link solo se la sottocartella esiste e ha almeno un
  file. Se una cartella non si riesce a leggere, per quella partita restano
  gli indirizzi di prima. Il file si riscrive solo se e' cambiato qualcosa
  (niente date dentro: il workflow fa un commit a ogni differenza).
  tornei.json lo legge e basta: lo riscrive sync_torneo.py.

Si lancia con:   python3 tools/sync_media.py
Opzioni:
  --check     legge il Drive e dice cosa cambierebbe, senza scrivere
              (esce con codice 1 se c'e' qualcosa da aggiornare)
Solo libreria standard: niente da installare.
"""
from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "data"
TORNEI = DATA / "tornei.json"
MEDIA = DATA / "media.json"

# La cartella principale del Drive e il torneo a cui appartengono le cartelle
# N_BIRRA_PERONI. Per un torneo nuovo si cambiano queste righe.
RADICE = "1pXU0WKECCFAbYGPn5olYiSYhgh5YjsBY"
TORNEO = "birra-peroni-2026"
CARTELLA_PARTITA = re.compile(r"(\d+)_BIRRA_PERONI")
# chiave in media.json -> nome esatto della sottocartella. Niente sinonimi:
# se una cartella si chiama in un altro modo, lo script lo dice e basta.
SOTTOCARTELLE = {"highlights": "HIGHLIGHTS", "foto": "FOTO_BELLE"}

ELENCO = "https://drive.google.com/embeddedfolderview?id="
CARTELLA_URL = "https://drive.google.com/drive/folders/"
ATTESA = 15        # secondi per ogni richiesta
TEMPO_MAX = 120    # secondi in tutto: il workflow ha 5 minuti
PAUSA = 0.3        # tra una richiesta e l'altra, per non martellare Google

NOTA = ("Scritto da tools/sync_media.py leggendo il Google Drive della squadra: non modificarlo a mano, "
        "al prossimo giro verrebbe riscritto. Per ogni partita (id di tornei.json) gli indirizzi delle "
        "sottocartelle HIGHLIGHTS e FOTO_BELLE; un link manca se la cartella non c'e' o e' vuota.")

# Gli id del calendario: bp26-a1g3 = 1º girone di Andata, giornata 3.
ID_PARTITA = re.compile(r"-([ar])(\d+)g(\d+)$")


class Illeggibile(Exception):
    """Il Drive non ha risposto, o ha risposto qualcosa che non e' l'elenco atteso."""


# ------------------------------------------------------------- il Drive ---
class Drive:
    def __init__(self):
        self.scadenza = time.monotonic() + TEMPO_MAX
        self.richieste = 0

    def elenco(self, id_cartella: str) -> list[dict]:
        """Le voci di una cartella: [{id, nome, cartella: bool}]. Solleva Illeggibile
        se la pagina non e' quella che conosciamo: meglio nessun dato che dati sbagliati."""
        if time.monotonic() > self.scadenza:
            raise Illeggibile("tempo finito")
        if self.richieste:
            time.sleep(PAUSA)
        self.richieste += 1
        req = urllib.request.Request(ELENCO + id_cartella, headers={
            "User-Agent": "Mozilla/5.0 (compatible; sync-media)",
            "Accept": "text/html",
        })
        try:
            with urllib.request.urlopen(req, timeout=ATTESA) as r:
                if r.status != 200:
                    raise Illeggibile(f"risposta {r.status}")
                testo = r.read().decode("utf-8", "replace")
        except Illeggibile:
            raise
        except Exception as e:      # rete, 404, cartella non piu' pubblica...
            raise Illeggibile(str(e)) from e
        return leggi_elenco(testo)


def leggi_elenco(testo: str) -> list[dict]:
    # Prova che e' davvero l'elenco di una cartella (e non una pagina di login,
    # un captcha o un HTML cambiato): ci deve essere il contenitore delle voci.
    if 'class="flip-entries"' not in testo:
        raise Illeggibile("nella pagina non c'e' l'elenco dei file (l'HTML di Google e' cambiato?)")
    voci = []
    for blocco in testo.split('<div class="flip-entry" ')[1:]:
        ident = re.match(r'id="entry-([\w-]+)"', blocco)
        link = re.search(r'href="https://drive\.google\.com/(drive/folders|file/d)/([\w-]+)', blocco)
        titolo = re.search(r'class="flip-entry-title">([^<]*)<', blocco)
        if not (ident and link and titolo) or link.group(2) != ident.group(1):
            raise Illeggibile("una voce dell'elenco non si legge (l'HTML di Google e' cambiato?)")
        voci.append({"id": ident.group(1), "nome": html.unescape(titolo.group(1)).strip(),
                     "cartella": link.group(1) == "drive/folders"})
    return voci


# ------------------------------------------------------- il calendario ---
def giornate(torneo: dict) -> dict[int, str]:
    """Numero della cartella -> id della partita. I gironi in fila (1º andata,
    1º ritorno, 2º andata, 2º ritorno...), ognuno lungo quante giornate ha."""
    lunghezza, ids = {}, {}
    for m in torneo.get("calendario") or []:
        g = ID_PARTITA.search(str(m.get("id") or ""))
        if not g:
            continue
        fase = (int(g.group(2)), 0 if g.group(1) == "a" else 1)
        n = int(g.group(3))
        lunghezza[fase] = max(lunghezza.get(fase, 0), n)
        ids[(fase, n)] = m["id"]
    mappa, prima = {}, 0
    for fase in sorted(lunghezza):
        for n in range(1, lunghezza[fase] + 1):
            if (fase, n) in ids:
                mappa[prima + n] = ids[(fase, n)]
        prima += lunghezza[fase]
    return mappa


def serializza(d) -> str:
    return json.dumps(d, ensure_ascii=False, indent=2) + "\n"


# ------------------------------------------------------------------- main ---
def sincronizza(solo_check: bool) -> int:
    avvisi: list[str] = []
    tornei = json.loads(TORNEI.read_text(encoding="utf-8"))
    torneo = next((t for t in tornei.get("tornei") or [] if t.get("id") == TORNEO), None)
    if not torneo:
        print(f"  AVVISO: in tornei.json non c'e' il torneo '{TORNEO}': media.json resta com'e'.")
        return 0
    numeri = giornate(torneo)

    try:
        vecchio = json.loads(MEDIA.read_text(encoding="utf-8")) if MEDIA.exists() else {}
    except (OSError, json.JSONDecodeError) as e:
        print(f"  AVVISO: data/media.json non si legge ({e}): lo riscrivo da zero.")
        vecchio = {}
    prima = vecchio.get("partite") or {}

    drive = Drive()
    try:
        radice = drive.elenco(RADICE)
    except Illeggibile as e:
        print(f"  AVVISO: non riesco a leggere la cartella principale del Drive ({e}). "
              "media.json resta com'e'.")
        return 0

    cartelle: dict[int, dict] = {}
    for v in radice:
        c = CARTELLA_PARTITA.fullmatch(v["nome"])
        if not (v["cartella"] and c):
            continue
        n = int(c.group(1))
        if n in cartelle:
            avvisi.append(f"due cartelle {v['nome']}: le salto tutte e due")
            cartelle[n] = None
        else:
            cartelle[n] = v
    if not any(cartelle.values()):
        print("  AVVISO: nella cartella principale non trovo nessuna cartella N_BIRRA_PERONI "
              "(nomi cambiati, o l'HTML di Google e' cambiato?). media.json resta com'e'.")
        return 0

    partite: dict[str, dict] = {}
    for n in sorted(cartelle):
        v = cartelle[n]
        id_partita = numeri.get(n)
        if not id_partita:
            avvisi.append(f"la cartella {n}_BIRRA_PERONI non corrisponde a nessuna giornata del calendario: la salto")
            continue
        if v is None:       # nome doppio: restano i link di prima
            if id_partita in prima:
                partite[id_partita] = prima[id_partita]
            continue
        voce = {"cartella": v["nome"]}
        try:
            dentro = drive.elenco(v["id"])
        except Illeggibile as e:
            avvisi.append(f"{v['nome']} non si legge ({e}): per {id_partita} restano i link di prima")
            if id_partita in prima:
                partite[id_partita] = prima[id_partita]
            continue
        nomi_cartelle = [x["nome"] for x in dentro if x["cartella"]]
        for chiave, nome in SOTTOCARTELLE.items():
            trovate = [x for x in dentro if x["cartella"] and x["nome"] == nome]
            if len(trovate) != 1:
                if trovate:
                    avvisi.append(f"{v['nome']}: {len(trovate)} cartelle {nome}, non so quale usare")
                else:
                    avvisi.append(f"{v['nome']}: manca la cartella {nome} "
                                  f"(ci sono: {', '.join(nomi_cartelle) or 'nessuna cartella'})")
                if trovate and (prima.get(id_partita) or {}).get(chiave):
                    voce[chiave] = prima[id_partita][chiave]
                continue
            try:
                contenuto = drive.elenco(trovate[0]["id"])
            except Illeggibile as e:
                avvisi.append(f"{v['nome']}/{nome} non si legge ({e}): resta il link di prima")
                if (prima.get(id_partita) or {}).get(chiave):
                    voce[chiave] = prima[id_partita][chiave]
                continue
            if contenuto:
                voce[chiave] = CARTELLA_URL + trovate[0]["id"]
        if len(voce) > 1:
            partite[id_partita] = voce

    for id_partita in prima:
        if id_partita not in partite:
            avvisi.append(f"{id_partita}: i link non ci sono piu' (cartella sparita o vuota), li tolgo")

    nuovo = {"_nota": NOTA, "partite": partite}
    for a in dict.fromkeys(avvisi):
        print(f"  AVVISO: {a}")
    link = sum(len(v) - 1 for v in partite.values())
    print(f"  · Drive: {len(partite)} partite con almeno un link, {link} link in tutto "
          f"({drive.richieste} cartelle lette)")

    testo_nuovo = serializza(nuovo)
    testo_vecchio = MEDIA.read_text(encoding="utf-8") if MEDIA.exists() else ""
    if testo_nuovo == testo_vecchio:
        print("  Tutto gia' aggiornato.")
        return 0
    if solo_check:
        print("  Da aggiornare: media.json")
        return 1
    MEDIA.write_text(testo_nuovo, encoding="utf-8")
    print("  Aggiornato data/media.json")
    return 0


def main(argv: list[str]) -> int:
    try:
        return sincronizza("--check" in argv)
    except Exception as e:      # qualsiasi imprevisto: avviso, niente scritto, workflow avanti
        print(f"  AVVISO: sync_media.py si e' fermato senza scrivere niente: {type(e).__name__}: {e}")
        return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
