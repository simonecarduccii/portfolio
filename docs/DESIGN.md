# Design — sistema visivo

**Fonte di verità: il file Figma "Portfolio · Reference"** (https://www.figma.com/design/1in2vBv6lx4Z1XYs2d27b1).
Il sito deve essere uguale alle pagine di quel file. Vedi sotto, "Figma → sito".

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
<<<<<<< HEAD
| `--paper` | `#FBFBFB` | Sfondo del sito: bianco neutro della nuova home (8/11 sera; prima era carta calda `#F6F2E9`). Fascia Ricerca visiva `#F8F8F8`, footer `#FFFFFF` |
| `--ink` | `#151515` | Testo e titoli su paper |
| `--ink-2` | `#585858` | Didascalie, label metadati, footer (AA su paper) |
| `--rule` | `#E4E4E4` | Filetti 1px (sotto la riga titolo, sotto la scheda metadati) |
| `--on-photo` | `#FFFFFF` | Testo sulle foto |
| `--on-photo-dim` | `rgba(255,255,255,.55)` | Voci non attive sopra le foto (es. il titolo non selezionato nella hero) |
| `--scrim` | `linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.45))` | Velo sotto il testo sulle foto, per la leggibilità |
| `--ph` | `#EFEFEF` | Segnaposto immagini |
=======
| `--paper` | `#F6F2E9` | Sfondo del sito: bianco caldo, appena ingiallito come carta di un vecchio libro (8/11) |
| `--ink` | `#1A1814` | Testo e titoli su paper |
| `--ink-2` | `#6E675C` | Didascalie, label metadati, footer (AA su paper) |
| `--rule` | `#DDD6C9` | Filetti 1px (sotto la riga titolo, sotto la scheda metadati) |
| `--on-photo` | `#FFFFFF` | Testo sulle foto |
| `--on-photo-dim` | `rgba(255,255,255,.55)` | Voci non attive sopra le foto (es. il titolo non selezionato nella hero) |
| `--scrim` | `linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.45))` | Velo sotto il testo sulle foto, per la leggibilità |
| `--ph` | `#E8E2D5` | Segnaposto immagini |
>>>>>>> origin/main

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

**File di riferimento:** "Portfolio · Reference",
https://www.figma.com/design/1in2vBv6lx4Z1XYs2d27b1 (creato l'8/11/2026, sostituisce la pagina
"Sito · Design system" del file Mokups, che resta solo come archivio dei mockup).

Il sito deve essere **praticamente uguale** a questo file. Quando Simone lo modifica e lo dice nel
progetto, il sito si rifà uguale.

### Com'è fatto il file

| Pagina Figma | Cosa contiene |
| --- | --- |
| Leggimi | Istruzioni per Simone (come modificare, cosa fare quando ha finito) |
| Design system | Campioni di colori, spazi e stili di testo, tutti legati alle variabili |
| Componenti | I pezzi delle pagine, con proprietà di testo modificabili dal pannello |
| 01 · Home … 13 · 404 | Una pagina per ogni file HTML, frame da 1366 px chiamato "Nome · file.html" |

**Componenti** (nome Figma → elemento del sito):

| Figma | HTML / classe |
| --- | --- |
| Header (Sfondo = Su foto / Su carta) | `.site-header.overlay` / `.site-header` |
| Footer | `.site-footer` |
| Foto (Tono = BN / Colore, campo File) | `.media` con `img` (il campo File è il percorso dell'immagine) |
| Fascia / Hero home | `.hero` con `.hero-list` |
| Fascia / Pellicole | `.band.band-color` con `.band-list` |
| Fascia / Archivio | `.band.band-bw` |
| Progetto / Hero (Altezza = Alta / Bassa) | `.p-hero` / `.p-hero.short` |
| Progetto / Titolo | `.p-title-row` |
| Fatto | `.fact` dentro `.p-facts` |
| Testo / Paragrafo · Lead · Sottotitolo · Statement · Voce elenco | `.prose p` · `.lead` · `.prose h2` · `.about-statement p` · `.prose li` |
| Nota bozza | `.draft-note` |
| Didascalia | `.fig-cap` |
| Card progetto (Formato = Grande / Media / Piccola) | `.tile` in `.stagger` / `.related-row` |
| Foto sequenza (Orizzontale / Verticale) | `.photo-seq li` (`.portrait`) |
| Galleria (Griglia / Schermate) | `.gallery.col` / `.gallery.col.shots` |
| Riga indice (Stato = Attivo / Privato) | `.index-list li` (`.is-private`) |
| Riga dati | `.about-data dl > div` |
| Indice archivio | `.archive-index` |
| Progetto successivo | `.next-project` |
| Titolo sezione · Link freccia · Bottone | `.small-title` · `.link-arrow` · `.btn` |

### Variabili (collezione "Sito", modalità "Desktop 1366")

Ogni variabile ha come code syntax WEB il nome CSS, per esempio `var(--paper)`.

| Figma | CSS |
| --- | --- |
| `color/paper` · `ink` · `ink-2` · `rule` · `ph` · `on-photo` · `on-photo-dim` | `--paper` · `--ink` · `--ink-2` · `--rule` · `--ph` · `--on-photo` · `--on-photo-dim` |
| `space/pad` · `section` · `stagger` · `gutter` | `--pad` · `--space-section` · `--space-stagger` · `--gutter` |
| `layout/text-width` · `header-height` · `band-hero` · `band-short` · `band-film` · `band-archive` | `--text-width` · `--header-h` · `--band-hero` · `--band-short` · `--band-film` · `--band-archive` |
<<<<<<< HEAD
| `type/hero-title` 56 · `page-title` 56 · `statement` 36 · `stat` 32 · `lead` 18 · `fact` 16 · `body` 15 · `section` 21 · `subhead` 13 · `band-link` 21 · `link` 12 · `nav` 16 · `index` 11 · `small` 11 · `caption` 10 · `fact-label` 9 | `--fs-hero-title` · `--fs-page-title` · `--fs-statement` · `--fs-stat` · `--fs-lead` · `--fs-fact` · `--fs-body` · `--fs-section` · `--fs-subhead` · `--fs-band-link` · `--fs-link` · `--fs-nav` · `--fs-index` · `--fs-year` · `--fs-caption` · `--fs-fact-label` |
=======
| `type/hero-title` 42 · `page-title` 40 · `statement` 36 · `stat` 32 · `lead` 18 · `fact` 16 · `body` 15 · `section` 13 · `subhead` 13 · `band-link` 13 · `link` 12 · `nav` 11 · `index` 11 · `small` 11 · `caption` 10 · `fact-label` 9 | `--fs-hero-title` · `--fs-page-title` · `--fs-statement` · `--fs-stat` · `--fs-lead` · `--fs-fact` · `--fs-body` · `--fs-section` · `--fs-subhead` · `--fs-band-link` · `--fs-link` · `--fs-nav` · `--fs-index` · `--fs-year` · `--fs-caption` · `--fs-fact-label` |
>>>>>>> origin/main
| `font/sans` · `font/mono` | `--font-sans` · `--font-mono` |

Stili di testo: 19 stili `Sito/…` (Hero title, Page title, Statement, Stat, Lead, Fact, Body,
Body strong, Section, Subhead, Band link, Link, Nav, Nav brand, Index, Small, Caption, Footer,
Fact label), con dimensione e carattere legati alle variabili.

**I valori di Figma sono quelli a 1366 px.** Il CSS può restare fluido con `clamp()`, ma a 1366 px
deve dare il valore di Figma. Oggi non è così per alcune misure (es. `--fs-body` dà 13,7 px invece
di 15, `--fs-fact` 15 invece di 16): vanno corrette alla prossima sincronizzazione.

### Flusso

1. Simone modifica il file: sposta, toglie o duplica blocchi, cambia testi, foto, componenti o
   variabili. Va bene anche uno schizzo ("qui una foto grande").
2. Simone scrive nel progetto "ho cambiato Figma" (meglio se dice quali pagine).
3. Il designer legge il file (struttura delle pagine, istanze dei componenti, variabili e stili),
   aggiorna questo documento e manda al front end la lista precisa delle modifiche
   (variabili CSS, blocchi spostati o nuovi, testi).
4. Il front end aggiorna HTML e `assets/style.css` e pubblica. Il designer confronta il sito con
   il file a 1366 px.

Regola: il sito non introduce colori, misure o blocchi che non esistano in Figma. Se serve
qualcosa di nuovo, prima si aggiunge in Figma (componente o variabile).
<<<<<<< HEAD


## Nuova home (8/11, Figma "01 - New Home")

Simone ha ridisegnato la home: è la nuova base per tutte le pagine. Specifica completa con misure in
`docs/NEW-HOME.md` (copia in /mnt/project-files/porfolio/docs/). In sintesi:
- Font: resta Hanken Grotesk (scelta di Simone 8/11, in Figma c'era Circular Std). In più **Overpass
  ExtraLight Italic** (200 italic) per il trattino dell'header e per tutto il footer.
- Header 96px, padding 36 + 8, nome 16px, tag 10px, "about" 16px; tracking 5%.
- Hero della home alta **sempre quanto la finestra** (`100svh`), foto fissa B/N con gradiente nero 25% dal basso.
- Variabili aggiornate nel Reference: `space/pad` 36, `header-height` 96, `band-hero` 770 (in home = 100svh),
  `band-film` 479, `band-archive` 296, `hero-title` e `page-title` 56, `section` e `band-link` 21, `nav` 16.
- Footer bianco, Overpass ExtraLight Italic 14, solo Instagram ed Email.
- La sezione "Progetti con l'AI" esce dalla home.
=======
>>>>>>> origin/main
