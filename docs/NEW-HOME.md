# Nuova home (Figma "01 - New Home", nodo 13:1027) → sito

Fonte: Portfolio · Reference, pagina "01 - New Home". Valori a 1366px.
Font: resta **Hanken Grotesk** ovunque (Simone ha scelto così l'8/11; in Figma c'è Circular Std).
Unica eccezione: **Overpass ExtraLight Italic** (Google Fonts, peso 200 italic) per il trattino dell'header e per il footer.

Foto (già nel branch `claude/project-thread-3trdia`, commit a1a3b9b):
img/home/hero.jpg (B/N), img/home/pellicole.jpg (colore), img/home/texture.jpg, img/home/archivio.jpg (B/N),
img/papa-che-fanno-i-papa/cover.jpg, img/faccioni/cover.jpg, img/place-of-freedom/cover.jpg, img/siculo/cover.jpg.

## Pagina
- Sfondo pagina #fbfbfb (solo home per ora; vedi nota colori in fondo).

## Header (sopra la hero, tutto bianco)
- Altezza 96, padding 36 orizzontale / 16 verticale (+8 interno).
- "Simone Carducci" 16px, tracking .8px · poi "-" in Overpass ExtraLight Italic 16 · poi "Creative development" e "Editorial, Events & Cultural Projects" 10px, tracking .5px, gap 16.
- A destra "about" 16px.

## Hero
- **Alta quanto la finestra, sempre**: `height: 100vh; height: 100svh;` (richiesta di Simone 8/11). Foto fissa img/home/hero.jpg, `object-fit: cover`, B/N.
- Gradiente sopra la foto: `linear-gradient(to top, rgba(0,0,0,.25) 26%, rgba(0,0,0,0))`.
- Padding 32 orizzontale, 48 verticale; titoli in basso a sinistra, gap 15.
- Titoli 56px MAIUSCOLO: "Colectivo modì" opacità .75, "Bohème Magazine" opacità 1; anni (2026, 2024) 21px opacità .5.

## Sezione 1 · fascia pellicole
- 1366×479, foto img/home/pellicole.jpg a colori, stesso gradiente, padding-x 96.
- Link "TUTTE LE MIE PELLICOLE", "TUTTO IL MIO ARCHIVIO", "TUTTA LA MIA VITA": 21.34px peso Book/400, line-height 1.0042, gap 5.
- Freccia a destra: chevron SVG sottile 9×43 (non il carattere ›).

## Sezione 2 · Ricerca visiva
- Sfondo #f8f8f8 + texture img/home/texture.jpg al 5% di opacità (ripetuta/cover).
- Titolo "Ricerca visiva" 21.34px nero, padding-top 64, padding-x 96, con sfumatura rgba(0,0,0,.05) dall'alto verso trasparente.
- Griglia 2 colonne, padding 96 verticale / 128 orizzontale, **zigzag una card per riga**:
  1. Papà che fanno i papà · colonna 1 · larga 540 · foto 540×371
  2. Faccioni · colonna 2 · larga 507 · foto alta 394
  3. Place of Freedom · colonna 1 · foto 555×279
  4. Siculo · colonna 2 · larga 421 · foto 421×371
- Card: `box-shadow: 0 0 12.15px rgba(0,0,0,.2)`.
- Didascalia sotto: titolo a sinistra, anno a destra; 16px, tracking .8px, colore #585858, line-height 1.4. Anni come in Figma: "2025-ongoing" / "2025".
- **La sezione "Progetti con l'AI" esce dalla home** (le pagine Vedetta/Coach restano online).

## Sezione 3 · fascia Archivio
- Alta 296, foto img/home/archivio.jpg B/N, padding 96 / 42, "Archivio" 21.34px, stesso chevron SVG. Link ad archivio.html.

## Footer
- Sfondo bianco, padding 36 / 16.
- Overpass ExtraLight Italic 14, tracking .7px, line-height 1.45.
- Sinistra "© 2025-2026 Simone Carducci. P.Iva - 18337621009" colore #151515.
- Destra solo "Instagram" e "Email" (niente CV), gap 14.

## Mobile
- Hero sempre a tutta altezza; zigzag diventa una colonna, card a tutta larghezza meno 16px di margine.

## Nota colori
La new home usa #fbfbfb / #f8f8f8 (bianco neutro) invece della carta calda #F6F2E9. Per ora la seguiamo sulla home; le altre pagine si allineano quando le ridisegno nel Reference.
