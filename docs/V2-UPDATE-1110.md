# Portfolio · v2 → sito: modifiche del 10/11

Fonte: Figma "Portfolio · v2" https://www.figma.com/design/KDLICTFzFlNTRb5Yv0iQL9. Riferimento = pagina Home (frame 1:58) e componenti Header (1:36), Footer (11:288), Fascia (11:466), Card (11:593). Valori a 1366px. Header e footer valgono per tutte le pagine (l'About in Figma usa ancora le versioni vecchie: va allineato alla Home).

## 1. Header
- Padding laterale 48 (era 36+8).
- **Niente trattino.** "Simone Carducci" (18 Regular, tracking 5%) poi, a 32px, "Creative development" in **Hanken Grotesk Italic 17**, tracking 5%. Il secondo tag resta nascosto.
- "about" a destra come prima.

## 2. Footer grande (tutte le pagine)
Alto **628** a 1366 (era ~806). Niente più IBM Plex Mono: tutto Hanken Grotesk.
- Sfondo **#151515**. Padding 36 ai lati, contenuto che parte a 34 dall'alto, 33 sotto.
- "SCRIVIMI" Bold **138px**, tracking -5%, line-height .9, #EEEDEA.
- **12px** sotto: email Medium 40, tracking -2%, sottolineata.
- 87 sotto: 4 colonne da 300 (gap 32), filetto in alto 1px #3A3936, padding-top 24, gap 14.
  - Etichette: Hanken **Italic** 15, maiuscolo, tracking 6%, #8E8C88.
  - Voci: Hanken **Medium** 15, maiuscolo, tracking 6%, #EEEDEA.
  - CONTATTI: solo l'email (minuscolo, tracking 0). **"Roma / Torino" tolto.**
  - ALTROVE: INSTAGRAM (colore **#EEAE9A**), LOMOGRAPHY, **LINKEDIN (nuovo)**: URL da chiedere a Simone; finché non c'è, la voce non si mostra.
  - SEZIONI: CULTURA, RICERCA VISIVA, ARCHIVIO, ABOUT.
  - CV: "SCARICA IL CV (PDF)" **senza freccia**.
- 87 sotto: riga finale space-between, Hanken Regular 14, maiuscolo, tracking 8%, #8E8C88: "© 2025-2026 Simone Carducci. Tutti i diritti riservati." · "Developed by me" · "P.Iva 18337621009".

## 3. Invariati
Hero, fascia pellicole e archivio (307), Ricerca visiva (6 card, stesse posizioni), About (testi e layout).
I componenti Card in Figma hanno ora formati 1:1, 4:3, 6:5, ma le card della home non li usano ancora: nessun cambio.
