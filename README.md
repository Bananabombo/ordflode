# Ordflöde — Schwedische Vokabeln

Eine minimalistische PWA (Progressive Web App) zum Lernen schwedischer Vokabeln.
Deutsches Wort rein, schwedisches Wort tippen — mit blinkendem Cursor, eigener
`å ä ö`-Tastenreihe und einer sanften Auflöse-Animation bei jeder richtigen Antwort.

Läuft komplett im Browser, **ohne Build-Schritt**, offline-fähig und lässt sich
auf dem iPhone/iPad über *„Zum Home-Bildschirm hinzufügen"* wie eine echte App
installieren.

## Funktionen

- **Niveauwahl** A1 / A2 (weitere Stufen folgen)
- **Tippen statt Klicken** — native Tastatur auf iOS, dazu `å ä ö`-Sondertasten
- Antwortprüfung tolerant bei Groß-/Kleinschreibung & Leerzeichen
- Substantive lehren den **Artikel** (`en`/`ett`), Verben die **Infinitiv-Form** (`att …`)
- „Zeigen"-Funktion; nicht gewusste Wörter kommen einmal wieder
- Fortschritt bleibt lokal gespeichert (localStorage)
- Wunderschönes Serifen-UI, hell & dunkel, subtile Übergänge
- Vollständige PWA: Manifest, Service Worker, App-Icons

## Lokal starten

Einfach einen statischen Server im Projektordner starten:

```bash
python3 -m http.server 8124
# → http://localhost:8124
```

(Ein Service Worker braucht `localhost` oder HTTPS — `file://` reicht nicht.)

## Projektstruktur

```
index.html              App-Shell (3 Screens: Start · Training · Abschluss)
css/styles.css          Design, Typografie, Animationen
js/app.js               Ablauflogik, Eingabe, Vergleich
data/a1.js  data/a2.js  Wortschatz (geprüft)  { de, sv, art?, pos, alt? }
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (Offline-Cache)
icons/                  App-Icons (SVG-Quelle + PNG-Größen)
```

### Vokabel-Datenformat

```js
{ de: 'das Haus', sv: 'hus', art: 'ett', pos: 'n' }
{ de: 'gehen',    sv: 'gå',              pos: 'v' }
{ de: 'gut',      sv: 'bra', pos: 'adj', alt: ['god'] }
```

`pos`: `n · v · adj · adv · num · pron · prep · konj · phr · interj`

## Datenquellen & Roadmap

Der aktuelle Wortschatz (A1: 179, A2: 101) ist **handgeprüft**. Für die geplante
Erweiterung auf den vollen A1+A2-Umfang (~2.800 Wörter) dienen diese offenen
Ressourcen als Grundlage:

- **Swedish Kelly-list** (Universität Göteborg, CC-BY-4.0) — 8.425 schwedische
  Lemmata mit CEFR-Stufe (A1–C2), Frequenz, Wortart und Artikel.
- **Deutsches Wiktionary** (CC-BY-SA) — für die deutschen Übersetzungen.
- **Folkets lexikon** (SV↔EN) — als Kontroll-/Fallback-Quelle.

Bei Verwendung dieser Daten sind die jeweiligen Lizenzen/Namensnennungen zu beachten.

## Lizenz

Code: MIT. Vokabeldaten: siehe jeweilige Quelle oben.
