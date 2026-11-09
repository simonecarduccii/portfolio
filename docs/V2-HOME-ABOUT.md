# Portfolio · v2 → sito: Home e About (9/11)

Fonte: Figma "Portfolio · v2" https://www.figma.com/design/KDLICTFzFlNTRb5Yv0iQL9 (frame Home 1:58, About 3:2, componenti Header 1:50, Footer 1:51). Valori a 1366px. Simone ha detto "aggiorna il sito online": da ora v2 è il riferimento per Home e About. Le altre pagine restano come sono, ma header e footer sono condivisi e cambiano ovunque.

## Header (tutte le pagine)
- Resta tutto com'è, ma **senza il secondo tag** "Editorial, Events & Cultural Projects": restano "Simone Carducci" · trattino · "Creative development" · about.

## Footer (tutte le pagine) — AGGIORNATO 9/11 01:45: footer grande scuro
Simone preferisce il footer scuro della prima versione. Componente "Footer grande" (6:2) in v2, alto 806 a 1366:
- Sfondo #0E0E0D, padding 120 sopra, 40 sotto, 48 ai lati.
- "SCRIVIMI" Hanken Grotesk Bold 150px, tracking -5%, line-height .9, colore #EEEDEA (mailto).
- 40 sotto: email "simone.carducci01@gmail.com" Hanken Medium 40px, tracking -2%, sottolineata (mailto).
- 120 sotto: 4 colonne uguali (gap 32), filetto in alto 1px #3A3936, padding-top 24, gap 14.
  Etichette IBM Plex Mono 15 Regular maiuscolo tracking 6% #8E8C88; voci IBM Plex Mono 15 Medium #EEEDEA.
  - CONTATTI: simone.carducci01@gmail.com (minuscolo, mailto), ROMA / TORINO
  - ALTROVE: INSTAGRAM (colore #E0623A), LOMOGRAPHY (https://www.lomography.com/homes/simonecarduccii)
  - SEZIONI: CULTURA (index.html#cultura), RICERCA VISIVA (index.html#ricerca-visiva), ARCHIVIO, ABOUT
  - CV: "↗ SCARICA IL CV (PDF)"
- 100 sotto: riga finale space-between, IBM Plex Mono 14 maiuscolo tracking 8% #8E8C88: "© 2025-2026 Simone Carducci. Tutti i diritti riservati." · "Developed by me" · "P.Iva 18337621009".
- Mobile: SCRIVIMI ~64px, colonne 2×2 poi 1, riga finale impilata.

## Home
- **Hero** (100svh): titoli in basso a sinistra, padding-left 26, padding-bottom 48. Ordine invertito:
  1. "BOHÈME MAGAZINE" opacità 1, anno "since 2023"
  2. "COLECTIVO MODÌ" opacità .75, anno "2025-2026"
  Anni 21px opacità .5 sulla linea di base, gap 8 dal titolo. Righe senza spazio extra tra loro (line-height ~1.3).
- **Fascia pellicole**: alta **307** (non più 479). Link, in quest'ordine: "TUTTO CIÒ CHE MI STA INTORNO", "TUTTE LE MIE PELLICOLE", "TUTTA LA MIA VITA". Il primo punta ad archivio.html come gli altri finché Simone non dice dove.
- **Ricerca visiva**: 6 card a zigzag, posizioni a 1366 (x dal bordo della pagina, y dall'inizio della sezione):
  | Card | x | y | larghezza | foto alta | anno | link | foto |
  |---|---|---|---|---|---|---|---|
  | Torino 17 | 136 | 185 | 540 | 371 | 2026 | nessuno (pagina non c'è) | manca |
  | Maghreb | 707 | 643 | 507 | 394 | 2026 | nessuno | manca |
  | Ghei | 128 | 1187 | 555 | 279 | 2025 | nessuno | manca |
  | Papà | 750 | 1552 | 421 | 371 | 2025 | papa-che-fanno-i-papa.html | img/papa-che-fanno-i-papa/cover.jpg |
  | Faccini | 128 | 1988 | 555 | 371 | 2025 | faccioni.html | img/faccioni/cover.jpg |
  | Vita mia | 683 | 2480 | 455 | 297 | 2025 | nessuno | manca |
  Didascalia subito sotto (gap 4), titolo a sinistra, anno a destra, 18px, tracking 5%, #585858. Ombra card come prima.
  Sezione: padding-bottom 96 dopo l'ultima card (in Figma c'è molto vuoto in fondo, lo togliamo).
  Card senza foto: segnaposto --ph con scritta piccola "foto in arrivo", non cliccabili.
- Place of Freedom e Siculo escono dalla home (le pagine restano online).
- **Fascia Archivio**: alta **307** come la fascia pellicole (era 296).

## About
Niente più foto a tutta pagina: header "su carta" (testo scuro) sopra.
- **Dati** (padding 40 / 36, filetto sotto): due colonne da 647, gap 0.
  - sinistra: ritratto quadrato 374×374 centrato nella colonna (x 173), segnaposto --ph finché non c'è img/about/ritratto.jpg
  - destra, centrata in verticale: 4 voci etichetta (11px Medium maiuscolo, tracking 6%, #585858) + valore (18px):
    Base "Torino" · Ambiti "editoria, eventi, progetti culturali, fotografia analogica" · Contatti "simone.carducci01@gmail.com" · Lingue "italiano, inglese, francese, spagnolo". Gap 20 tra le voci, 6 tra etichetta e valore.
- **Titolo "SIMONE CARDUCCI" grande: tolto.** Tieni un h1 nascosto (sr-only) per accessibilità.
- **Colonna testo**: larga 990 (x 188), padding 64 sopra e sotto, gap 40. Statement 36px Medium. Blocchi come prima, ma i paragrafi sono **giustificati** in Figma: usa `text-align: justify; hyphens: auto` con `lang="it"`. Testi uguali a oggi; nessuna nota [DA VERIFICARE].
- **Scheda**: larga 926 (x 220), etichetta 200 + valore. Cambiano:
  - Lingue: "Italiano, inglese, francese, spagnolo"
  - Formazione: "Beni culturali: Università di Torino - Universidad de Granada - Université Paris Cité" a capo "Google UX Design Certificate (2024) - WSET Level 2 (2023)"
  Poi link "CV (PDF)" e "Scrivimi" (17px Medium, gap 32).
- Spazio 96, poi fascia Archivio (296) e footer.

## Mobile
Dati About: ritratto sopra, voci sotto. Colonna testo e scheda a tutta larghezza con margine 16; sotto 600px il testo torna allineato a sinistra (il giustificato su colonne strette fa buchi).
