#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_torneo.py — scarica classifica, calendario e numeri dal sito del torneo
(Quick Tournament, qt.at4s.it) e li scrive nei JSON del sito.

Il sito del torneo e' un'app che legge i dati da un'API pubblica, senza login:

    https://qt-api.at4s.it/api/public/championships/<id>/
    https://qt-api.at4s.it/api/public/championships/<id>/teams/<id squadra>/

Il browser di chi visita shakhtarpalese.it NON puo' chiamarla direttamente
(l'API non manda gli header CORS, quindi la richiesta verrebbe bloccata): per
questo i dati si copiano nei nostri JSON con questo script, che gira da solo
su GitHub (.github/workflows/sync-torneo.yml) e si puo' lanciare anche a mano.

Quali tornei: quelli di data/tornei.json che hanno il campo
    "quick_tournament_id": "08df0e8e-cd02-4501-87e8-c40ec0388029"
(e' il codice che si legge nell'indirizzo della pagina pubblica del torneo).

Cosa scrive
  data/tornei.json
    · classifica          riscritta intera, com'e' sul sito del torneo
    · calendario          solo le NOSTRE partite, tutte, con date e risultati.
                          'campo' e 'note' scritti a mano restano
    · stato               da 'in_programma' passa a 'in_corso' alla prima
                          partita giocata (a 'concluso' lo metti tu)
  data/statistiche.json   (solo per il torneo 'corrente')
    · gol, ammonizioni, espulsioni  contati dai referti delle nostre partite
    · mvp                           dalla classifica "migliori giocatori"
    Sono gli unici campi che ha: niente altro resta da aggiornare a mano.

Se l'API non risponde o risponde qualcosa di strano, lo script si ferma SENZA
scrivere niente: meglio dati vecchi di un giorno che una classifica cancellata.

Si lancia con:   python3 tools/sync_torneo.py
Opzioni:
  --check     scarica e dice cosa cambierebbe, senza scrivere
              (esce con codice 1 se c'e' qualcosa da aggiornare)
Solo libreria standard: niente da installare.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
API = "https://qt-api.at4s.it/api/public/championships/"

# Tipi di evento nei referti (MatchEventType nel codice del sito del torneo).
GOL, GIALLO, ROSSO, DOPPIO_GIALLO = 1, 2, 3, 4

# Sigle che nei nomi squadra restano maiuscole ("FC VISION" -> "FC Vision").
SIGLE = {"FC", "AC", "AS", "ASD", "SSD", "US", "SC", "CF", "SS"}


# ------------------------------------------------------------------ utili ---
def scarica(url: str):
    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "shakhtarpalese.it sync (github.com/NicoloIacobone/shakhtar_palese)",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def chiave(nome: str) -> str:
    """Per confrontare i nomi: niente maiuscole, niente accenti, spazi singoli."""
    s = unicodedata.normalize("NFKD", str(nome or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(s.casefold().split())


def carica(nome: str):
    return json.loads((DATA / nome).read_text(encoding="utf-8"))


def serializza(d) -> str:
    return json.dumps(d, ensure_ascii=False, indent=2) + "\n"


class Nomi:
    """Traduce i nomi squadra del torneo ("JALAPEÑOS") in quelli gia' usati nel
    sito ("Jalapeños"), cosi' la riga arancione e i controlli continuano a
    funzionare. Una squadra mai vista prende le iniziali maiuscole."""

    def __init__(self, torneo: dict):
        self.noti = {}
        for r in torneo.get("classifica") or []:
            self.noti.setdefault(chiave(r.get("squadra")), r.get("squadra"))
        for m in torneo.get("calendario") or []:
            for lato in ("casa", "ospite"):
                self.noti.setdefault(chiave(m.get(lato)), m.get(lato))
        noi = torneo.get("nostra_squadra")
        self.noti[chiave(noi)] = noi

    def __call__(self, nome: str) -> str:
        k = chiave(nome)
        if k not in self.noti:
            self.noti[k] = " ".join(p if p.upper() in SIGLE else p.capitalize()
                                    for p in str(nome).split())
        return self.noti[k]


# Il nome delle giornate sul sito del torneo e' scritto a mano e non sempre
# uguale: "1 giornata (andata 1)", "4 giornata ( ritorno 1)", "4 giornata andata 2".
GIORNATA = re.compile(r"(\d+)\s*[°ºª]?\s*giornata\W*(andata|ritorno)\W*(\d+)", re.I)


# ------------------------------------------------------------- classifica ---
def classifica(api: dict, nomi: Nomi) -> list[dict]:
    righe = []
    for gruppo in api.get("standings") or []:
        for r in gruppo.get("rows") or []:
            righe.append({
                "pos": r["position"], "squadra": nomi(r["teamName"]), "punti": r["points"],
                "g": r["played"], "v": r["won"], "n": r["drawn"], "p": r["lost"],
                "gf": r["goalsFor"], "gs": r["goalsAgainst"], "dr": r["goalDifference"],
            })
    return righe


# ------------------------------------------------------------- calendario ---
def calendario(api: dict, torneo: dict, nomi: Nomi, id_noi: str) -> list[dict]:
    vecchie = {m.get("id"): m for m in torneo.get("calendario") or []}
    # Il prefisso delle sigle partita resta quello gia' in uso (bp26-a1g1 -> bp26).
    prefisso = next((str(i).split("-")[0] for i in vecchie if i and "-" in str(i)), torneo["id"])
    # Il campo: quello che hai scritto tu per le partite gia' presenti, altrimenti
    # il nome piu' usato fin qui, e solo come ultima scelta quello del torneo.
    campi = Counter(m.get("campo") for m in vecchie.values() if m.get("campo"))
    campo_solito = campi.most_common(1)[0][0] if campi else ""

    partite, usati = [], Counter()
    for m in api.get("matches") or []:
        if id_noi not in (m.get("homeTeamId"), m.get("awayTeamId")):
            continue
        g = GIORNATA.search(m.get("round") or "")
        if g:
            giornata, fase, n = int(g.group(1)), g.group(2).lower(), int(g.group(3))
            girone = f"{n}º girone di {fase}"
            id_partita = f"{prefisso}-{fase[0]}{n}g{giornata}"
        else:   # fasi finali o nomi che non so leggere: il testo com'e'
            giornata, girone = None, (m.get("round") or "").strip()
            id_partita = f"{prefisso}-{(m.get('date') or 'x')[:10]}"
        usati[id_partita] += 1
        if usati[id_partita] > 1:
            id_partita += f"-{usati[id_partita]}"

        prima = vecchie.get(id_partita, {})
        data, _, ora = (m.get("date") or "").partition("T")
        giocata = m.get("homeScore") is not None and m.get("awayScore") is not None
        note = prima.get("note", "")
        if giocata and not note:
            if m.get("isForfeit"):
                note = "Risultato a tavolino"
            elif m.get("homePenaltyScore") is not None:
                note = f"Ai rigori {m['homePenaltyScore']}-{m['awayPenaltyScore']}"

        partite.append({
            "id": id_partita,
            "girone": girone,
            "giornata": giornata,
            "data": data,
            "ora": ora[:5],
            "casa": nomi(m["homeTeam"]),
            "ospite": nomi(m["awayTeam"]),
            "gol_casa": m["homeScore"] if giocata else None,
            "gol_ospite": m["awayScore"] if giocata else None,
            "stato": "giocata" if giocata else ("da_giocare" if data else "da_definire"),
            "campo": prima.get("campo") or campo_solito or m.get("location") or "",
            "note": note,
            "_referto": m,          # serve alle statistiche, si toglie prima di scrivere
        })
    partite.sort(key=lambda p: (p["data"] or "9999", p["ora"]))
    return partite


# ------------------------------------------------------------ statistiche ---
def statistiche(stat: dict, rosa: dict, api: dict, partite: list[dict], noi: str) -> list[str]:
    """Aggiorna stat sul posto. Ritorna gli avvisi da stampare."""
    avvisi = []
    per_numero = {r["numero"]: r for r in stat.get("giocatori") or []}
    per_nome = {chiave(f"{g['cognome']} {g['nome']}"): g["numero"] for g in rosa.get("giocatori") or []}

    def numero_di(nome, maglia):
        # Prima il nome (sul torneo e' "Cognome Nome"), poi il numero di maglia:
        # se qualcuno cambia numero a meta' stagione, il nome resta giusto.
        n = per_nome.get(chiave(nome), maglia)
        if n not in per_numero:
            avvisi.append(f"{nome} (#{maglia}) non ha una riga in statistiche.json: lo salto")
            return None
        return n

    conti = {n: {"gol": 0, "ammonizioni": 0, "espulsioni": 0} for n in per_numero}
    for p in partite:
        if p["stato"] != "giocata":
            continue
        in_casa = chiave(p["casa"]) == chiave(noi)
        for e in p["_referto"].get("events") or []:
            if e.get("isHome") != in_casa:
                continue
            n = numero_di(e.get("playerName"), e.get("shirtNumber"))
            if n is None:
                continue
            quanti = e.get("count") or 1
            if e.get("type") == GOL:
                conti[n]["gol"] += quanti
            elif e.get("type") == GIALLO:
                conti[n]["ammonizioni"] += quanti
            elif e.get("type") == ROSSO:
                conti[n]["espulsioni"] += quanti
            elif e.get("type") == DOPPIO_GIALLO:
                # Il secondo giallo e' comunque un giallo (conta per la diffida).
                conti[n]["ammonizioni"] += quanti
                conti[n]["espulsioni"] += quanti

    for n, c in conti.items():
        per_numero[n].update(c)

    # MVP: nei referti non c'e', solo nella classifica "migliori giocatori", che
    # il torneo taglia ai primi 10. Chi esce dai primi 10 tiene l'ultimo valore
    # visto: il numero di MVP puo' solo salire.
    for r in (api.get("rankings") or {}).get("bestPlayers") or []:
        if chiave(r.get("teamName")) != chiave(noi):
            continue
        n = numero_di(r.get("playerName"), r.get("shirtNumber"))
        if n is not None:
            per_numero[n]["mvp"] = max(per_numero[n].get("mvp") or 0, r.get("value") or 0)
    return avvisi


# ------------------------------------------------------------------- main ---
def main(argv: list[str]) -> int:
    solo_check = "--check" in argv
    tornei_d, stat_d, rosa_d = carica("tornei.json"), carica("statistiche.json"), carica("rosa.json")
    prima = {"tornei.json": serializza(tornei_d), "statistiche.json": serializza(stat_d)}
    avvisi = []

    da_sincronizzare = [t for t in tornei_d.get("tornei") or [] if t.get("quick_tournament_id")]
    if not da_sincronizzare:
        print("  Nessun torneo con 'quick_tournament_id' in tornei.json: niente da fare.")
        return 0

    for torneo in da_sincronizzare:
        qt = torneo["quick_tournament_id"]
        try:
            api = scarica(f"{API}{qt}/")
        except Exception as e:     # rete, 404, JSON rotto: non si scrive niente
            print(f"  ERRORE: non riesco a leggere il torneo {torneo['nome']} ({qt}): {e}")
            return 1

        noi = torneo["nostra_squadra"]
        righe = [r for g in api.get("standings") or [] for r in g.get("rows") or []]
        nostra = next((r for r in righe if chiave(r.get("teamName")) == chiave(noi)), None)
        if not righe or not nostra:
            print(f"  ERRORE: nella classifica di {torneo['nome']} non trovo '{noi}'. "
                  f"Squadre: {', '.join(r.get('teamName', '?') for r in righe) or 'nessuna'}")
            return 1

        nomi = Nomi(torneo)
        torneo["classifica"] = classifica(api, nomi)
        partite = calendario(api, torneo, nomi, nostra["teamId"])
        if any(m.get("homeScore") is not None for m in api.get("matches") or []) \
                and torneo.get("stato") == "in_programma":
            torneo["stato"] = "in_corso"

        if torneo["id"] == tornei_d.get("corrente"):
            avvisi += statistiche(stat_d, rosa_d, api, partite, noi)
        for p in partite:
            del p["_referto"]
        torneo["calendario"] = partite
        giocate = sum(p["stato"] == "giocata" for p in partite)
        print(f"  · {torneo['nome']}: {len(torneo['classifica'])} squadre, "
              f"{len(partite)} nostre partite ({giocate} giocate)")

    dopo = {"tornei.json": serializza(tornei_d), "statistiche.json": serializza(stat_d)}
    cambiati = [f for f in dopo if dopo[f] != prima[f]]
    for a in dict.fromkeys(avvisi):
        print(f"  AVVISO: {a}")

    if not cambiati:
        print("  Tutto gia' aggiornato.")
        return 0
    if solo_check:
        print(f"  Da aggiornare: {', '.join(cambiati)}")
        return 1
    for f in cambiati:
        (DATA / f).write_text(dopo[f], encoding="utf-8")
        print(f"  Aggiornato data/{f}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
