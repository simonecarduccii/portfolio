# Componenti Figma → blocchi di pagina

Fonte: Figma **Portfolio · v2** (`KDLICTFzFlNTRb5Yv0iQL9`), pagina **Componenti**, sezione **Blocchi** (`25:4`).
Ogni blocco è largo 1366 nel disegno. Sul sito si adatta alla larghezza della pagina, con margine laterale `--pad` (36 px a 1366).
Quando Simone aggiunge o cambia un componente, il Designer aggiorna questa scheda e lo comunica all'Admin.

## Sempre presenti (non sono blocchi)

| Componente | Nodo | Note |
|---|---|---|
| Header (Su foto / Su carta) | `1:50` | `.site-header`; "Su foto" solo sopra una foto a tutta pagina |
| Footer (Piccolo / Grande) | `11:287` | `.site-footer`; il sito usa sempre Grande |

## Blocchi

| Blocco | Nodo | Contenuti modificabili | Classe CSS |
|---|---|---|---|
| Titolo pagina | `25:5` | Titolo, Anno | `.p-title-row` + `.p-title` + `sup.yr` |
| Foto grande | `25:10` | 1 foto | `.photo-first` (copertina) / `.p-hero` (a tutta pagina, sotto header "Su foto") |
| Testo | `25:13` | Testo (uno o più paragrafi), Nota (facoltativa) | `.photo-intro` (+ `.meta`) per l'intro, `.prose` / `.photo-text` per il testo lungo. Colonna 600 px centrata |
| Citazione | `25:17` | Citazione, Autore (facoltativo) | **nuova**: `.quote` da creare. Hanken Italic 32/130%, centrata, max 900 px, autore 13 px #585858, spazio 72 sopra e sotto |
| Scheda dati | `25:21` | Righe etichetta / valore | `.p-facts` (`dl > .fact > dt/dd`) |
| Sequenza foto | `25:110` (varianti) | Foto (lista ordinata), Layout | `.photo-seq.layout-{colonna, alternato, griglia, grande, ritmo}`; regole nella pagina Figma "Layout foto" (`22:7`) |
| Altri progetti | `25:112` | nessuno (automatico: altri progetti di Ricerca visiva visibili, massimo 3) | `.related` + `.related-row` + `.tile` |
| Progetto successivo | `25:132` | Progetto di destinazione | `.next-project` |
| Fascia | `11:466` (Pellicole / Archivio) | Variante | `.band-color` (Pellicole) / `.band-bw` (Archivio) |

## Blocchi solo di Home / About (non riusabili per ora)

Hero home (`1:59`, `.hero`), griglia Ricerca visiva (`1:87`, `.research` / `.zigzag`), About: dati (`3:15`), colonna testo (`3:29`), scheda (`3:46`).

## Misure comuni

- Colori: carta #FBFBFB, inchiostro #151515, secondario #585858, filetti #E4E4E4.
- Font: Hanken Grotesk (titolo pagina SemiBold 56, testo 17/150%, etichette Italic 13 maiuscolo).
- Foto 3:2 salvo diversa indicazione; spazio tra foto 16.
