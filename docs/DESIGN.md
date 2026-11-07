# Design — sistema visivo

Fonte: mockup Figma (`Mokups`: wireframe Desktop + PROT 1/2 + Frame 4/5/6), i ritagli inviati da Simone
il 7/11/2026 (A24, Herzog & de Meuron, Benoit P. "Inside The Subway", footer Canada / A24 / MUBI)
le pagine A24 Backrooms e Notes, la home MUBI, e i riferimenti a24films.com, francescomerlini.com, camillaferrari.it, kinou.fr, pennybanks.com,
oliviatruong.design.

## Idea

**Un portfolio che si sfoglia come il catalogo di una casa di produzione.**
Due registri, sempre nello stesso sistema:

1. **Cinema (A24)** per la home e i progetti culturali: immagine a tutto schermo, titoli enormi,
   scheda metadati tipo locandina, testo in una colonna centrale.
2. **Archivio (Herzog & de Meuron / Benoit P.)** per fotografia e archivio: carattere monospace
   piccolo, tanto bianco, foto in sequenza verticale centrata, didascalie minime.

Mood: **cinematografico, asciutto, analogico.**

Regole d'oro:
- L'immagine comanda. Niente box, ombre, bordi arrotondati, gradienti decorativi.
- Un solo colore d'accento, usato pochissimo.
- Il testo grande è grande davvero, il testo piccolo è piccolo davvero. Niente vie di mezzo.
- Ogni dato (anno, ruolo, formato, pellicola) va in monospace: è la "voce d'archivio" del sito.

## Palette

| Token | Valore | Uso |
| --- | --- | --- |
| `--paper` | `#F2F1EE` | Sfondo di tutto il sito (grigio caldo come A24/MUBI, non bianco puro) |
| `--ink` | `#111111` | Testo e titoli |
| `--ink-2` | `#6B6862` | Testo secondario, didascalie, label metadati (AA su paper, ~5:1) |
| `--rule` | `#D6D3CC` | Filetti 1px |
| `--night` | `#0D0D0C` | Archivio, footer, hero senza immagine |
| `--night-ink` | `#EDEBE6` | Testo su night |
| `--night-rule` | `#3A3936` | Filetti su night |
| `--signal` | `#E2542B` | Accento "pellicola" (arancio Kodak/Lomo). Solo: voce di menu attiva, pulsante "Un'altra foto" in hover, focus, badge "Privato". Mai su superfici grandi. |
| `--ph` | `#E3E0D9` | Segnaposto immagini |

Niente dark mode: il sito è chiaro; Archivio e footer sono scuri, come una sala di proiezione.

## Tipografia

Due famiglie, Google Fonts, gratuite:

- **Inter Tight** (500, 600, 700): titoli e testo. Neo-grotesk stretta, la cosa più vicina alla
  voce A24 senza font a pagamento.
- **IBM Plex Mono** (400, 500): metadati, didascalie, navigazione, numeri, pagine fotografiche.

```html
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Stile | Famiglia | Peso | Dimensione | Interlinea | Tracking | Uso |
| --- | --- | --- | --- | --- | --- | --- |
| `display-xl` | Inter Tight | 600 | `clamp(44px, 8.5vw, 136px)` | .9 | -0.035em | Lista titoli nella hero della home (iniziale maiuscola, come A24) |
| `display-title` | Inter Tight | 700 | `clamp(40px, 7vw, 104px)` | .9 | -0.03em | Titolo pagina progetto, MAIUSCOLO |
| `h2` | Inter Tight | 600 | `clamp(32px, 4.6vw, 64px)` | .95 | -0.025em | Titoli di sezione |
| `h3` | Inter Tight | 600 | `clamp(22px, 2.2vw, 30px)` | 1.1 | -0.015em | Titoli card, sottotitoli nel testo |
| `lead` | Inter Tight | 500 | `clamp(19px, 1.7vw, 23px)` | 1.35 | -0.01em | Riga "in breve" |
| `body` | Inter Tight | 500 | `17px` | 1.55 | -0.005em | Testo corrente, max 62ch |
| `fact` | Inter Tight | 500 | `clamp(18px, 1.7vw, 24px)` | 1.2 | -0.01em | Valori della scheda metadati |
| `mono` | IBM Plex Mono | 400 | `13px` | 1.55 | 0 | Testo delle pagine fotografiche (stile H&dM) |
| `label` | IBM Plex Mono | 500 | `11px` | 1.3 | 0.06em | MAIUSCOLO: label, nav, didascalie, anni in apice |

Dettagli:
- Anni accanto ai titoli: `label` in apice, come "Backrooms ²⁰²⁶" su A24.
- `font-variant-numeric: tabular-nums` in liste, schede e numeri.
- Niente corsivi o grassetti nel testo lungo (solo `strong` a 600 per i nomi).

## Griglia e spazi

- Margine laterale: `--pad: clamp(16px, 2.2vw, 32px)` (16px su telefono).
- 12 colonne, gutter `clamp(12px, 1.6vw, 24px)`. Layout a larghezza piena; max-width solo sul testo.
- Colonna di testo culturale: `max-width: 640px`, centrata (PROT 1). Pagine foto: testo a sinistra
  su 6 colonne (H&dM) oppure centrato sopra la sequenza (Benoit P.), max 560px.
- Scala spazi (multipli di 8): 8, 16, 24, 40, 64, 104, 168. Sezioni: `padding-block: clamp(64px, 10vw, 168px)`.
- Breakpoint: 640px (telefono), 1024px (tablet). Sotto 640 tutto in una colonna.
- Filetti 1px `--rule`, solo per scheda metadati, liste e footer.

## Componenti

**Header.** Fisso, 64px. Sinistra `SIMONE CARDUCCI` in `label`. Destra
`Cultura · Archivio · Fotografia · AI · About` in `label`; voce attiva con pallino `--signal`.
Sopra la hero è trasparente con testo bianco; dopo 40px di scroll diventa `--paper` al 92% con blur.
Mobile: `MENU` a destra, overlay `--night` a tutto schermo con le voci in `h2`.

**Didascalia.** `label` in `--ink-2` sotto ogni immagine: titolo a sinistra, anno/formato a destra,
una riga (card di Frame 6). Sulle immagini a tutto schermo: in basso a sinistra, bianca.

**Scheda metadati.** Griglia 3 colonne (2 su mobile), gap 32/24. Ogni voce: `label` sopra, `fact`
sotto. In alto a destra `↗ VISITA` in `label`. Filetto sotto. È il blocco "Directed by / Year /
Get tickets" di PROT 1.

**Link.** `label` con `↗` davanti. Hover: sottolineato 1px, offset 4px. Focus: outline 2px `--signal`.

**Pulsante.** Uno solo: "Un'altra foto" nell'Archivio. `label`, bordo 1px, padding 12×18, nessun
raggio. Hover: sfondo `--signal`.

**Badge "Privato".** `label` in `--signal` con pallino 6px. Per i progetti AI non pubblici.

**Immagini.** Mai arrotondate, mai ombre. Hover sulle card: zoom 1.03 in 600ms e didascalia da
`--ink-2` a `--ink`. Caricamento: dissolvenza 400ms. `prefers-reduced-motion` spegne tutto.

**Footer (scelta: A24 nero, con le colonne etichettate di Canada).** Sfondo `--night`.
- Riga 1: `Scrivimi` in `display-title` + email grande in `h3` (link). È la call to action del
  portfolio, quindi grande.
- Riga 2: quattro colonne con filetto `--night-rule` sopra ciascuna e `label` di testa
  (come A24): **CONTATTI** (email, Torino/Roma), **ALTROVE** (Instagram, Lomography; LinkedIn solo se Simone lo conferma),
  **SEZIONI** (Cultura, Archivio, Fotografia, AI, About), **CV** (`↗ Scarica il CV (PDF)`).
  Link in `label` maiuscolo, come A24.
- Riga 3: `© 2025–2026 Simone Carducci. Tutti i diritti riservati.` · `P.Iva 18337621009`
  in `label` `--ink-2`.
Niente newsletter né icone social: solo testo.

## Layout delle pagine

### Home (`index.html`)

Struttura dal wireframe Figma "Desktop" (hero / due metà / banda piena / due metà / footer),
reinterpretata con il ritaglio A24 (Frame 6).

1. **Hero 100svh**, foto a tutto schermo (una dall'archivio, casuale a ogni visita). In basso a
   sinistra la **lista dei progetti in `display-xl`**, uno per riga, anno in apice:
   Bohème Magazine · Colectivo modì · Siculo · Papà che fanno i papà · Place of Freedom · Faccioni.
   Hover su un titolo: lo sfondo diventa la sua copertina, gli altri titoli scendono al 40%.
   In basso a destra `↓`. In alto, sotto l'header, `Creative development — Editorial, Events &
   Cultural Projects` in `label`.
2. **Manifesto** (blocco logo + manifesto di MUBI): a sinistra, colonne 1–5, il nome
   `Simone Carducci` in `h2`; a destra, colonne 7–12, il manifesto in `label` maiuscolo su 4–5
   righe brevi, una idea per riga. Molto bianco sopra e sotto.
3. **Progetti culturali**: le due metà del wireframe. Bohème e modì affiancati, foto 4:5,
   didascalia sotto, `lead` di una riga.
4. **Archivio fotografico**: banda a tutta larghezza (come le sezioni di MUBI), 80svh, foto
   casuale a pieno schermo con il testo sopra in basso a sinistra, bianco, in `h2` MAIUSCOLO:
   `Tutte le mie pellicole.` Sotto il titolo: `↗ APRI L'ARCHIVIO` e `↗ TUTTO SU LOMOGRAPHY`.
   Click sulla foto = un'altra.
5. **Progetti fotografici**: **griglia sfalsata** come Frame 6. Le foto si alternano tra colonne
   7–12 e 1–6 con larghezze diverse (6, 5, 8, 4 colonne) e spazi verticali ampi (104–168px),
   ognuna con didascalia.
6. **Progetti AI**: anteprima dell'indice (vedi sotto), max 3 righe, `↗ TUTTI I PROGETTI AI`.
7. Footer.

### Progetto culturale (`boheme.html`, `modi.html`) — modello A24 (PROT 1/2)

1. Hero 82svh, foto a tutto schermo, didascalia bianca in basso a sinistra. Per modì la hero
   può essere un **video muto in loop** (10–15 s di un DJ set, MP4 H.264 sotto i 4 MB, con
   `poster` = un fotogramma), come la hero video del riferimento studio/agenzia.
2. Riga titolo: `display-title` MAIUSCOLO a sinistra; a destra una miniatura 16:9 alta come il
   titolo (la foto piccola accanto a "CLARYN CHONG"). Filetto sotto.
3. Scheda metadati: RUOLO · ANNO · AMBITO · FORMATO (+ TEAM/LUOGO se servono) + `↗ VISITA`.
4. Testo in colonna di 640px **allineata a partire dalla colonna 5** della griglia (come
   Backrooms su A24: non centrata, il vuoto a sinistra è voluto). Riga "in breve" in `lead`,
   poi 2–4 blocchi con `h3`. Mobile: tutta larghezza.
5. **Numeri** (Bohème): tre cifre in `display-title` su una riga con `label` sotto
   (5.022 follower · 563 caroselli · 1,47M visualizzazioni). Filetti sopra e sotto.
6. Galleria (come Backrooms): **dentro la stessa colonna del testo**, griglia a 2 colonne di
   immagini verticali 4:5 o 9:16, gap 4px. Perfetta per i caroselli e le storie di Bohème e i
   frame dei DJ set di modì. Se c'è un'immagine orizzontale forte, va prima a tutta larghezza.
7. Variante PROT 2: dove ci sono due temi paralleli (es. modì: serate / podcast), due colonne di
   testo con `h3` in testa.
8. "Progetto successivo": titolo del prossimo in `h2` con `→`.

### Progetto fotografico (`siculo.html` ecc.) — H&dM + Benoit P.

1. Niente hero. Header su `--paper`.
2. **Testata in mono** in alto a sinistra, 6 colonne: titolo in mono 500 18px, sotto luogo,
   `Progetto: 2025 — in corso`, poi intro breve (max 40 parole) in `mono`, e un trattino `—`.
3. Prima immagine **a tutta larghezza** (dentro i margini), formato originale.
4. **Sequenza verticale centrata** (Benoit P.): foto larghe 5 colonne su desktop (~42%), gap 16px,
   nessuna didascalia, solo `01/24` in `label` a lato. Mobile: 100%.
5. **Testo lungo in fondo**, centrato sulla stessa larghezza delle foto, in `body`
   (il racconto arriva dopo aver visto le foto). Sotto, i crediti in `label`.
6. Riga © del progetto: `© Simone Carducci 2025. Fotografie su pellicola, non riproducibili
   senza autorizzazione.`
7. **"Altri progetti"**: striscia di 3–4 miniature 4:3 affiancate con didascalia (come "You may
   also like" di Benoit P. e "Related" di H&dM).

### Archivio (`archivio.html`) — sala di proiezione

- Sfondo `--night`, testo `--night-ink`, header scuro.
- Al centro una sola foto, `object-fit: contain`, alta max 78svh, che galleggia sul nero.
- Sotto, una riga in `label`: a sinistra `N. 0347 — Kodak Portra 400 — Roma, 2024` (o solo il
  numero se mancano i dati); a destra **Un'altra foto** e `↗ Lomography`.
- Click sulla foto o barra spaziatrice = nuova foto casuale, dissolvenza 400ms.
- Sotto la piega (facoltativo): provino a contatto, miniature 3:2 con gap 2px, 6 colonne desktop / 3
  mobile (la griglia di miniature di H&dM).

### Progetti AI (`ai.html`) — indice

Registro "laboratorio": niente hero, una tabella-indice come un elenco crediti.

- Titolo `h2` + `lead` di due righe.
- Righe a tutta larghezza, filetto tra le righe, colonne:
  `N.` (mono) · **Progetto** (`h3`) · Cosa fa (body, 1 riga) · Strumenti (`label`) · Anno · Stato.
- Righe: **Bohème Vedetta** (motore bandi per Bohème), **Coaching per la corsa**,
  **Lettura** (progetto per una persona della mia famiglia: nel sito non si nomina il padre, vedi copy) con badge `● PRIVATO`: riga in `--ink-2`, non cliccabile, nessuna
  immagine. Si dichiara che esiste, non si mostra.
- Hover su riga pubblica (desktop): miniatura 4:3 che segue il cursore.
- Ogni progetto pubblico apre una scheda nel **modello articolo A24** (Notes): hero 60svh in
  bianco e nero o screenshot su `--night`, poi data in `label`, titolo in `display-title` a
  iniziale maiuscola (non tutto maiuscolo) su due righe, scheda metadati breve
  (Ruolo · Anno · Strumenti · Stato), testo nella colonna da 640px dalla colonna 5,
  2–3 screenshot in griglia a 2 colonne.

### About (`about.html`) — non un CV (camillaferrari, francescomerlini)

1. **Statement a tutta larghezza** in `display-xl` (600, iniziale maiuscola, non tutto maiuscolo),
   su 11 colonne, in alto sotto l'header: "Curo progetti culturali dall'idea al pubblico…".
   Una parola chiave può andare in `--ink-2` per dare ritmo, nient'altro.
2. **Ritratto su pellicola + blocchi.** Ritratto 4:5 a sinistra su 5 colonne, `position: sticky`
   (resta fermo mentre scorrono i blocchi), con didascalia mono sotto (pellicola, anno).
   A destra, colonne 7–12: i cinque blocchi (Da dove vengo, Gli anni in giro, Quello che faccio
   oggi, Cosa studio, Cosa cerco), ognuno con titoletto in `label` sopra e testo in `body`,
   separati da 64px. "Cosa cerco" chiude con il testo in `lead` (è il messaggio per chi assume).
   Mobile: ritratto sopra, non sticky.
3. **Tabella dati in mono** a tutta larghezza, filetto tra le righe, due colonne:
   label (3 col) · valore (9 col, `mono` 13px): Ambiti, Competenze, Strumenti, Lingue, Formazione.
4. In fondo, due link grandi in `h2` affiancati: `↗ CV (PDF)` e `↗ Scrivimi`.

## Lunghezze dei testi (accordo con il copy)

- Titoli progetto: brevi, resi in maiuscolo dal CSS (scriverli normali).
- "In breve": max 20 parole, una riga di `lead`.
- Culturali: 2–4 blocchi da 60–90 parole, ognuno con un titoletto di 2–4 parole.
- Foto: intro max 40 parole in testata + testo lungo in fondo 80–150 parole + crediti.
- AI: "Cosa fa" max 10 parole (sta in una riga di tabella).
- Manifesto home: una frase, max 18 parole.

## Note per il front end

- Sostituire in `style.css` le variabili con i token qui sopra.
- Archivo/Inter → Inter Tight + IBM Plex Mono (un solo `<link>`).
- Le classi esistenti (`.hero`, `.p-hero`, `.p-facts`, `.gallery`, `.tile`) restano: cambiano i
  valori. Nuove: `.hero-list` (titoli in hero), `.stagger` (griglia sfalsata), `.photo-head`
  (testata mono), `.photo-seq` (sequenza centrata), `.related` (altri progetti),
  `.index-table` (AI), footer scuro `.site-footer--night`.
- Tavola di stile visiva: `docs/design-board.html` (aprila nel browser per vedere token e componenti).

## Photo editing (selezione e sequenza)

Il designer fa anche da photo editor: sceglie, ordina ed esporta le foto quando Simone le carica.

**Dove caricarle.** Gli originali (scansioni, anche pesanti) vanno nella cartella del progetto
in `img/<progetto>/originali/` o in una cartella del Mac da collegare. Il photo editor sceglie,
ordina ed esporta le versioni web nella cartella `img/<progetto>/`.

**Quante.**
- Progetti fotografici: 12–20 foto in sequenza + 1 apertura larga + 1 copertina (`cover.jpg`).
- Bohème e modì: 1 hero orizzontale, 1 miniatura 16:9, 4–6 foto per la galleria.
- Archivio: 60–150 foto, quelle che reggono da sole. Più sono, più il "random" funziona.
- Hero della home: 6–10 foto orizzontali forti (una per progetto e alcune dall'archivio).

**Come si sceglie.** Una foto entra solo se aggiunge qualcosa alla serie. Niente doppioni
dello stesso momento: si tiene lo scatto migliore. Si apre con l'immagine che dice di cosa parla
il progetto e si chiude con quella che lascia una domanda. Si alternano piani larghi e stretti,
pieni e vuoti, e si evitano due foto di fila con la stessa luce o lo stesso colore dominante.
Orizzontali e verticali non si mescolano a caso: nella sequenza centrata si tiene un formato
prevalente, e le foto dell'altro formato vengono raggruppate.

**Esportazione.**
- JPEG sRGB, qualità 80, metadati GPS rimossi.
- Lato lungo: 2000px per tutte le foto dei progetti (cover, apertura, sequenza, galleria),
  1800px per l'archivio, 900px per le miniature dell'archivio (`thumbs/`). L'export lo fa
  `tools/optimize_images.py` del back end.
- Grana e bordi della pellicola si lasciano. Nessun ritocco oltre polvere e livelli.
- Nomi: `01.jpg`, `02.jpg`, … nell'ordine della sequenza; `cover.jpg` per la copertina.
- Archivio: `img/archivio/0001.jpg`, … più un `archivio.json` con numero, pellicola, luogo e anno
  (anche vuoti), che alimenta la didascalia dell'archivio.
- Testo alternativo: breve e descrittivo, scritto dal photo editor in `docs/progetti/<progetto>.md`.
