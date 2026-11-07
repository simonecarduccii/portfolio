# Design — sistema visivo

**Fonte delle impostazioni: la pagina Figma "Sito · Design system"** (vedi sotto, "Figma → sito").

**Riferimento per i layout: i mockup Figma di Simone "Desktop · Primary · 1366"** (home, pagina
Bohème Magazine, pagina Archivio), inviati il 7/11/2026 alle 18:56. Dove questo documento e i
mockup non coincidono, valgono i mockup.

Riferimenti secondari, usati solo per ciò che i mockup non mostrano: A24 (Backrooms, Notes, PROT 1/2),
Herzog & de Meuron e Benoit P. "Inside The Subway" (pagine dei progetti fotografici), MUBI, footer
Canada/A24/MUBI, a24films.com, francescomerlini.com, camillaferrari.it, kinou.fr, pennybanks.com,
oliviatruong.design.

## Idea

**Un sito fatto di fotografie a tutta larghezza, con pochissimo testo piccolo sopra.**
Il testo non compete con le immagini: titoli in maiuscolo di media grandezza, tutto il resto
piccolo. Le foto culturali e di paesaggio sono in **bianco e nero**; le foto dei progetti
fotografici restano a colori, come sono state scattate.

Mood: **analogico, sobrio, cinematografico.**

Regole d'oro:
- L'immagine comanda: bande fotografiche a tutta larghezza, una dopo l'altra, senza margini.
- Testo bianco sopra le foto, sempre in basso a sinistra o al centro, mai su un riquadro.
- Una sola famiglia di caratteri sans. Niente colori d'accento, niente ombre, niente bordi arrotondati.
- La navigazione tra le immagini avviene con frecce sottili `‹ ›` ai lati delle bande.

## Palette

| Token | Valore | Uso |
| --- | --- | --- |
| `--paper` | `#F3F3F1` | Sfondo del sito (grigio chiarissimo dei mockup) |
| `--ink` | `#111111` | Testo e titoli su paper |
| `--ink-2` | `#6B6A66` | Didascalie, label metadati, footer (AA su paper) |
| `--rule` | `#D9D8D4` | Filetti 1px (sotto la riga titolo, sotto la scheda metadati) |
| `--on-photo` | `#FFFFFF` | Testo sulle foto |
| `--on-photo-dim` | `rgba(255,255,255,.55)` | Voci non attive sopra le foto (es. il titolo non selezionato nella hero) |
| `--scrim` | `linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.45))` | Velo sotto il testo sulle foto, per la leggibilità |
| `--ph` | `#E3E2DE` | Segnaposto immagini |

Niente accento colorato e niente dark mode. Il colore sta tutto nelle fotografie.

Trattamento foto: le hero dei progetti culturali, la banda Archivio e la pagina Archivio usano le foto in
**bianco e nero** (esportate già in b/n, non con un filtro CSS). La banda delle pellicole e i
progetti fotografici sono a colori.

## Tipografia

Una famiglia: **Hanken Grotesk** (400, 500, 600 e 400 corsivo) da Google Fonts. È un grotesk
pulito vicino ai mockup, ed è disponibile sia su Google Fonts sia in Figma: così il file Figma e
il sito usano lo stesso carattere (Inter Tight in Figma non c'è).
**IBM Plex Mono** resta solo nelle pagine dei progetti fotografici (testata stile H&dM), che i
mockup non mostrano. Se Simone preferisce, si può togliere anche da lì.

```html
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Misure prese dai mockup a 1366px:

| Stile | Peso | Dimensione | Interlinea | Tracking | Uso |
| --- | --- | --- | --- | --- | --- |
| `hero-title` | 500 | `clamp(26px, 3vw, 42px)` | 1.05 | 0 | MAIUSCOLO. Titoli dei progetti nella hero della home |
| `page-title` | 600 | `clamp(26px, 3vw, 40px)` | 1 | 0 | MAIUSCOLO. Titolo della pagina progetto ("BOHÈME MAGAZINE") |
| `year` | 400 | `11px` | 1 | .02em | Anno accanto ai titoli, allineato alla base, `--ink-2` o bianco al 70% |
| `band-link` | 500 | `13px` | 1.35 | .04em | MAIUSCOLO. Voci sopra le bande foto ("TUTTE LE MIE PELLICOLE") |
| `section` | 500 | `13px` | 1.3 | 0 | Etichette di sezione in paper ("Ricerca visiva"), voce della banda ("Archivio") |
| `fact-label` | 500 | `9px` | 1.2 | .08em | MAIUSCOLO, `--ink-2`. Etichette della scheda ("IDEATED BY", "YEAR") |
| `fact` | 600 | `clamp(13px, 1.1vw, 16px)` | 1.25 | 0 | Valori della scheda metadati |
| `body` | 400 | `clamp(13px, 1vw, 15px)` | 1.55 | 0 | Testo dei progetti, giustificato a sinistra |
| `nav` | 400 | `11px` | 1.3 | 0 | Header |
| `caption` | 400 | `9–10px` | 1.3 | 0 | Didascalie delle foto e footer |
| `index` | 400 | `11px` | 1.6 | 0 | Voci dell'indice nella pagina Archivio |

Dettagli:
- Il maiuscolo lo fa il CSS (`text-transform: uppercase`); i testi si scrivono normali.
- `font-variant-numeric: tabular-nums` per anni e numeri.
- Footer in corsivo (`font-style: italic`), come nei mockup.

## Griglia e spazi

- Margine laterale `--pad: clamp(16px, 2.4vw, 32px)` per il testo; le bande foto sono a
  **tutta larghezza, senza margine**.
- 12 colonne per posizionare testo e immagini nella griglia sfalsata.
- Testo dei progetti: colonna centrata, `max-width: 600px` (circa il 44% a 1366px, come nei mockup).
- Le bande si toccano tra loro (gap 0). Tra una banda e una sezione su paper: `clamp(48px, 6vw, 88px)`.
- Breakpoint: 640px e 1024px. Sotto 640 tutto in una colonna e le bande diventano 4:5.

## Componenti

**Header.** Sopra la prima foto, trasparente, testo bianco, altezza 56px, stile `nav`.
A sinistra, in fila con 32px di spazio: `Simone Carducci` (500) · `Creative development` ·
`Editorial, Events & Cultural Projects`. A destra: `about`. Nient'altro: le sezioni si
raggiungono dalle bande della home. Allo scroll diventa `--paper` al 92% con testo `--ink`.
Mobile: solo `Simone Carducci` a sinistra e `about` a destra.

**Banda foto (band).** Immagine a tutta larghezza con `object-fit: cover`, `--scrim` sotto il
testo, testo bianco. Una freccia sottile `›` (e `‹` dove si torna indietro) a 32px dal bordo,
centrata in verticale: cambia la foto della banda (dissolvenza 400ms), oppure porta alla pagina
collegata. Altezze a 1366px: hero 500px (≈ 37vw, min 60svh su mobile), banda pellicole 330px,
banda archivio 200px.

**Didascalia.** Sotto la foto, stile `caption`, `--ink-2`: titolo a sinistra, anno a destra
("Papà che fanno i papà ··· 2025-ongoing").

**Scheda metadati.** Griglia a 3 colonne, `fact-label` sopra e `fact` sotto, 20px tra le righe.
Voci: IDEATED BY · YEAR · ARTISTIC DIRECTION · (altre secondo il progetto). Filetto `--rule` sotto,
poi 64px di spazio prima del testo.

**Footer.** Una sola riga sotto l'ultima banda, `caption` in corsivo, `--ink-2`, 16px di padding:
a sinistra `© 2025-2026 Simone Carducci. P.iva 18337621009`, a destra `Instagram · Email`.
Prima del footer, su tutte le pagine tranne l'Archivio, c'è la **banda Archivio** (foto di
paesaggio in b/n, voce `Archivio` a sinistra e `›` a destra), che porta alla pagina Archivio.

**Immagini.** Mai arrotondate, mai ombre. Hover sulle foto della griglia: zoom 1.02 in 600ms.
`prefers-reduced-motion` spegne zoom e dissolvenze.

## Layout delle pagine

### Home (`index.html`) — mockup "Desktop · Primary", prima tavola

1. **Hero** (banda, ≈ 500px a 1366): foto b/n di Bohème/modì a tutta larghezza.
   In basso a sinistra, uno sotto l'altro, i **progetti culturali** in `hero-title` MAIUSCOLO con
   l'anno in `year` accanto: `COLECTIVO MODÌ 2026` e `BOHÈME MAGAZINE 2024`. Il titolo attivo è
   bianco pieno, l'altro `--on-photo-dim`. Passando sopra un titolo, la foto della hero diventa la
   sua e il titolo si accende; click = pagina del progetto.
2. **Banda pellicole** (≈ 330px): foto a colori dall'archivio. A sinistra, centrate in verticale,
   tre voci `band-link` MAIUSCOLE una sotto l'altra:
   `TUTTE LE MIE PELLICOLE` (→ Lomography), `TUTTO IL MIO ARCHIVIO` (→ archivio.html),
   `TUTTA LA MIA VITA` (→ archivio.html, indice). A destra `›`: cambia la foto a caso.
3. **Ricerca visiva** (su paper): etichetta `section` "Ricerca visiva" in alto a sinistra, poi la
   **griglia sfalsata** dei quattro progetti fotografici, una foto per riga, alternate:
   - Papà che fanno i papà: colonne 2–6
   - Faccioni: colonne 7–11
   - Place of Freedom: colonne 2–6
   - Siculo: colonne 8–11 (più piccola)
   Foto in 4:3, spazio verticale tra l'una e l'altra ≈ 100px, didascalia sotto ciascuna.
4. **Progetti AI** (non nei mockup, aggiunta richiesta da Simone): stessa logica delle bande,
   oppure una piccola sezione su paper con l'etichetta `section` "Progetti con l'AI" e un elenco
   di 3 righe (titolo · cosa fa · anno), "Lettura" segnata come privato e non cliccabile. Va
   **prima** della banda Archivio.
5. **Banda Archivio** + footer.

### Progetto culturale (`boheme.html`, `modi.html`) — mockup, seconda tavola

1. **Hero** foto b/n a tutta larghezza (≈ 500px a 1366), senza testo sopra. Per modì può essere un
   video muto in loop (`img/modi/hero.mp4` + `hero-poster.jpg`).
2. **Riga titolo** su paper: `page-title` MAIUSCOLO + `year` accanto, filetto sotto.
3. **Scheda metadati** a 3 colonne (vedi Componenti).
4. **Testo** in colonna centrata da 600px, stile `body`, 3–4 paragrafi.
5. **Galleria** (non nei mockup): sotto il testo, nella stessa colonna, griglia a 2 colonne di
   immagini verticali 4:5 (caroselli Bohème, frame dei DJ set), gap 4px.
6. **Banda Archivio** + footer.

### Archivio (`archivio.html`) — mockup, terza tavola

Una sola schermata (100svh), foto b/n a tutta pagina, header bianco sopra.
- Al centro, l'**indice "Tutta la mia vita"** in tre colonne, stile `index`, bianco:
  - Viaggi · Libri · Exhibitions · Film · Musica · Album · Outfit
  - Pellicole · Fotografie · Fotocamere · Tatuaggi · Personal media · Podcast · Note
  - Concerti · Montagne · Mappamondo · Calcio · Pesi · Poster · Ragazzi
- A sinistra la freccia `‹` (e `›` a destra): cambia la foto di sfondo pescandone una a caso
  dall'archivio (click sulla foto o barra spaziatrice fanno lo stesso).
- Ogni voce dell'indice apre la sua raccolta (per la consegna basta che **Pellicole** porti a
  Lomography e **Fotografie** mostri le foto dell'archivio a una a una). Le voci non ancora
  pronte restano visibili ma non cliccabili, al 55%.
- Footer in basso, sopra la foto, in bianco. Niente banda Archivio su questa pagina.

### Progetto fotografico (`siculo.html` ecc.) — non nei mockup

Si tiene la logica dei mockup (paper, testo piccolo, foto protagoniste) con lo schema
H&dM / Benoit P.:
1. Riga titolo come nelle pagine culturali (`page-title` + `year`, filetto), poi una breve
   intro (max 40 parole) in colonna centrata.
2. **Sequenza verticale centrata**: foto a colori larghe 5 colonne (≈ 42%), gap 16px, nessuna didascalia.
3. Testo lungo in fondo, nella stessa colonna, poi
   `© Simone Carducci 2025. Fotografie su pellicola, non riproducibili senza autorizzazione.` in `caption`.
4. "Altri progetti": le altre tre serie in fila, 4:3, con didascalia.
5. Banda Archivio + footer.

### Progetti AI (`ai.html`) — non nei mockup

Su paper. Riga titolo `PROGETTI CON L'AI`, filetto, poi un elenco a righe (filetto tra le
righe): titolo in `fact` · cosa fa in `body` · anno in `year`. Bohème Vedetta e Running Coach
cliccabili; **Lettura** in `--ink-2`, etichetta "privato", nessun link né immagine.
Le schede dei singoli progetti usano lo schema della pagina culturale (hero, titolo, scheda,
testo). Banda Archivio + footer.

### About (`about`) — nei mockup è solo il link nell'header

Su paper, stesso tono delle pagine progetto:
1. Hero: ritratto su pellicola in b/n a tutta larghezza (o 4:5 a sinistra su mobile).
2. Riga titolo `SIMONE CARDUCCI`, filetto, scheda metadati
   (BASE · AMBITI · LINGUE · CONTATTI).
3. Statement in `hero-title` (in `--ink`, non maiuscolo) in colonna centrata, poi i cinque blocchi
   del copy (Da dove vengo, Gli anni in giro, Quello che faccio oggi, Cosa studio, Cosa cerco), ognuno
   con l'etichetta in `fact-label` sopra e il testo in `body`.
4. Tabella finale label/valore (Ambiti, Competenze, Strumenti, Lingue, Formazione), filetto tra le
   righe, poi `CV (PDF)` · `Scrivimi`.
5. Banda Archivio + footer.

## Lunghezze dei testi (accordo con il copy)

- Titoli progetto: brevi, scritti normali (il maiuscolo lo fa il CSS).
- Pagine culturali: 3–4 paragrafi da 60–90 parole. Niente titoletti, come nel mockup.
- Pagine foto: intro max 40 parole + testo in fondo 80–150 parole + crediti.
- AI: "cosa fa" max 10 parole.
- About: statement sotto le 20 parole.

## Photo editing (selezione e sequenza)

Il designer fa anche da photo editor: sceglie, ordina ed esporta le foto quando Simone le carica.

**Dove caricarle.** Gli originali vanno in `img/<progetto>/originali/` o in una cartella del Mac da
collegare. Il photo editor sceglie, ordina ed esporta le versioni web in `img/<progetto>/`.

**Quante.**
- Home: 2 hero b/n (una per Bohème, una per modì), 6–10 foto a colori per la banda pellicole,
  1 paesaggio b/n per la banda Archivio.
- Progetti fotografici: 12–20 foto in sequenza + `cover.jpg` (4:3, per la griglia della home).
- Bohème e modì: 1 hero b/n orizzontale, 4–6 immagini verticali per la galleria.
- Archivio: 60–150 foto, di cui almeno 10 paesaggi b/n che reggono l'indice sopra.

**Come si sceglie.** Una foto entra solo se aggiunge qualcosa alla serie. Niente doppioni dello
stesso momento. Si apre con l'immagine che dice di cosa parla il progetto e si chiude con quella che
lascia una domanda. Si alternano piani larghi e stretti, e si evitano due foto di fila con la stessa
luce. Nelle bande con testo sopra si scelgono foto con una zona calma (cielo, muro, acqua) dove va il testo.

**Esportazione.** Con `tools/optimize_images.py` del back end:
- JPEG sRGB, qualità 80, EXIF/GPS rimossi.
- 2000px di lato lungo per i progetti, 1800px per l'archivio, 900px per le miniature (`thumbs/`).
- Il bianco e nero si fa in esportazione (non con `filter: grayscale` nel CSS).
- Grana e bordi della pellicola si lasciano. Nessun ritocco oltre polvere e livelli.
- Nomi: `cover.jpg`, `hero.jpg`, `01.jpg`, `02.jpg`… nell'ordine della sequenza.
- Archivio: `img/archivio/0001.jpg`… + `archivio.json`
  (`[{"n":"0001","file":"0001.jpg","film":"","luogo":"","anno":null}]`).
- Video hero modì: `tools/optimize_video.py <file> modi` → `img/modi/hero.mp4` + `hero-poster.jpg`.
- Testo alternativo: breve e descrittivo, in `docs/progetti/<progetto>.md`.

## Note per il front end

- Token: sostituire `--signal`, `--night` e `--night-*` con quelli della palette sopra
  (`--on-photo`, `--on-photo-dim`, `--scrim`).
- Il menu a cinque voci, la lista enorme di titoli nella hero, il footer nero e il manifesto
  vanno tolti: i mockup non li prevedono.
- Classi da avere: `.band` (+ `.band-arrow`), `.hero-titles`, `.band-links`, `.stagger`,
  `.p-title-row`, `.p-facts`, `.p-text`, `.archive-index`, `.site-footer` (una riga).
- La tavola `docs/design-board.html` è superata dai mockup: va aggiornata o ignorata.

## Figma → sito (come restano allineati)

**File:** https://www.figma.com/design/50dO9NGqQLHjXvDPaL2Xa9/Mokups?node-id=64-44 ,
pagina **"Sito · Design system"**.

Nel file ci sono:
- la collezione di variabili **Sito** (modalità "Desktop 1366"), con 28 variabili;
- 12 stili di testo **Sito/…**, che usano le variabili per dimensione e carattere;
- una tavola con colori, tipografia e la banda della hero, tutti collegati alle variabili.

Ogni variabile ha come "code syntax" il nome CSS che il sito usa:

| Figma | CSS |
| --- | --- |
| `color/paper` · `ink` · `ink-2` · `rule` · `ph` · `on-photo` · `on-photo-dim` | `--paper` · `--ink` · `--ink-2` · `--rule` · `--ph` · `--on-photo` · `--on-photo-dim` |
| `space/pad` · `space/section` · `space/stagger` | `--pad` · `--space-section` · `--space-stagger` |
| `layout/text-width` · `header-height` · `band-hero` · `band-film` · `band-archive` | `--text-width` · `--header-h` · `--band-hero` · `--band-film` · `--band-archive` |
| `type/<stile>` (hero-title, page-title, band-link, section, fact, body, nav, index, year, caption, fact-label) | `--fs-<stile>` |
| `font/sans` · `font/mono` | `--font-sans` · `--font-mono` |

I valori in Figma sono quelli desktop a 1366px. Nel CSS le dimensioni dei titoli restano in
`clamp(min, vw, max)`, dove il **max** è il valore di Figma.

**Flusso.**
1. Simone modifica in Figma: variabili, stili `Sito/…` o i mockup delle pagine.
2. Simone scrive nel thread Designer "ho cambiato Figma".
3. Il designer legge il file con `get_variable_defs`, gli stili e `get_design_context` sulle
   pagine. Poi aggiorna questa tabella e DESIGN.md e manda al front end la lista delle variabili
   CSS da cambiare.
4. Il front end aggiorna `:root` in `assets/style.css` e pubblica.

Regola: il sito non introduce colori o misure che non esistano come variabile in Figma. Se
serve un valore nuovo, prima si crea in Figma.
