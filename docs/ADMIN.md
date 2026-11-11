# Pannello /admin

Indirizzo: **https://bohememag.it/simonecarducci/admin/**

Da qui cambi i testi e le foto del sito senza toccare il codice. Ogni salvataggio va su GitHub
e dopo 2-3 minuti il sito online è aggiornato (lo fa da sola l'Action "Update site").

## 1. Primo accesso (una volta sola)

Il pannello entra nel repository con un **token GitHub**, una specie di password solo per questo sito.

1. Apri [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. **Token name:** `portfolio admin`. **Expiration:** la durata che preferisci (es. 1 anno).
3. **Repository access:** *Only select repositories* → `simonecarduccii/simonecarducci`.
4. **Permissions → Repository permissions → Contents:** *Read and write*.
5. **Generate token** e copialo (inizia con `github_pat_`). Tienilo per te: chi lo ha può modificare il sito.
6. Apri https://bohememag.it/simonecarducci/admin/, incolla il token ed **Entra**.

Il browser se lo ricorda (pulsante **Esci** per toglierlo). Lo stesso token serve per la sincronizzazione delle cartelle del Mac (punto 3).

## 2. Come è fatto

A sinistra c'è l'albero del sito, come in `information_architecture`:
**Home** (Hero con Bohème e modì, Pellicole, Ricerca visiva con Faccini, Ghei, Papà, Vita mia, Progetti con l'AI, Archivio), **Pagine**, **Impostazioni**, **About**, **Archivio**.
Clicca un elemento: al centro trovi insieme le sue **foto** e i suoi **testi**, a destra l'anteprima della pagina online.
Il triangolino ▸ / ▾ accanto a un ramo lo apre o lo chiude (il browser se lo ricorda); il campo *Cerca una pagina…* in alto filtra l'albero
(Invio apre il primo risultato, Esc svuota).

- **Copertina**: *Sostituisci*, oppure trascina una foto dal Finder sopra la copertina. Quella di Bohème e di modì è anche lo sfondo dell'hero in home; quella dei progetti fotografici è anche la loro foto nella griglia.
- **Sequenza**: trascina le foto per cambiare l'ordine (o usa ← →), ★ la rende copertina, × la toglie. Per aggiungerne, *+ Aggiungi foto* o trascinale dal Finder sulla griglia.
- **Interruttori**: ogni scheda della Home (Hero, Bohème, modì, Pellicole, Ricerca visiva, Progetti con l'AI, Archivio) ha un interruttore *Visibile in home*,
  che trovi anche sotto le schede di *Home → Dentro questa sezione*. Spento = la sezione sparisce dalla home (nel pannello resta, con la scritta *spento*). Le scelte sono in `content/home.json` (`sezioni`).
- **Ricerca visiva**: scegli quali progetti compaiono nella griglia della home (interruttore *In home*, c'è anche nella scheda di ogni progetto) e in che ordine (trascinali o ↑ ↓). Si aprono tutti, anche quelli ancora senza pagina: in home questi si vedono con il riquadro *foto in arrivo*. Il titolo che scrivi lì è anche il titolo della pagina del progetto e del suo nome nell'albero. L'elenco è in `content/home.json`.
- **Nuovi progetti**: in *Ricerca visiva*, *+ Nuovo progetto* chiede titolo e anno e crea subito il progetto: la sua pagina
  (`<titolo>.html`), la scheda dei testi (`docs/progetti/<titolo>.md`), la cartella delle foto (`img/<titolo>/`). Nasce **spento** in home:
  aprilo dall'albero, carica copertina e foto, scegli il layout, scrivi i testi, poi accendilo. Per i progetti ancora senza pagina
  (es. Torino 17) c'è *Crea pagina*. *Elimina* toglie il progetto con pagina, testi e foto (restano recuperabili nella cronologia di GitHub).
- **Formato in home**: in *Ricerca visiva*, sotto il titolo di ogni progetto, scegli la forma della sua foto nella griglia della home
  (come da design, 3:2, 4:3, 6:5, 16:9, 1:1, 5:6, 3:4, 2:3). La miniatura mostra subito la forma. Non cambia le foto dentro la pagina del progetto.
  Il valore è `formato` in `content/home.json`.
- **Layout dei progetti fotografici** (Faccini, Ghei, Papà, Vita mia): sotto la copertina c'è l'interruttore *Mostra la copertina grande in cima alla pagina*
  (spento = la pagina parte dalla prima foto della sequenza; in home la copertina resta). Poi scegli uno dei layout standard cliccando la miniatura:
  **Colonna** (una foto per riga, al centro), **Alternato** (una a sinistra, una a destra), **Griglia** (due per riga),
  **Grande** (tutta larghezza), **Ritmo** (una grande, poi due affiancate). Sul telefono le foto sono sempre una per riga.
  **Casuale** genera un layout a caso (ogni clic, o *↻ Un altro*, ne crea uno nuovo); se ti piace, *♥ Salva tra i miei layout*
  lo aggiunge alle miniature con il nome che scegli, e lo puoi usare anche negli altri progetti (× lo toglie). I layout salvati sono in
  `content/layout/_layouts.json`: ogni riga è un elenco di `[colonna di partenza, larghezza]` su 12 colonne, e le righe si ripetono lungo la pagina.
  La *Sequenza della pagina* sotto è un'anteprima in piccolo della pagina: le foto sono già disposte come nel layout scelto, e cambiano subito se cambi layout.
  Le scelte sono in `content/layout/<pagina>.json`; i layout sono le classi `.photo-seq.layout-<nome>` in `assets/style.css`.
- **Testo tra le foto** (progetti fotografici): sotto la *Sequenza della pagina*, *+ Aggiungi testo* aggiunge un riquadro di testo;
  spostalo con ↑ ↓ o trascinandolo tra le foto, × lo toglie. Sul sito il testo compare tra le foto, in colonna come i testi della pagina,
  e il layout riparte dopo ogni testo. È `testi` (`{dopo: foto prima del testo, testo}`) in `content/layout/<pagina>.json`.
- **Scheda tecnica** (progetti fotografici): un campo vuoto o con “–” non compare sul sito. Se il supporto è *Digitale*, *Pellicola*
  sparisce (anche dal pannello); *Lente* è facoltativa.
- **Scheda dati in alto** (Bohème, modì, progetti con l'AI): le voci sotto il titolo (Year, Creative direction, Where…).
  Puoi cambiare etichetta e valore, aggiungere voci (*+ Aggiungi voce*), toglierle (×) e spostarle (↑ ↓). Ogni voce ha un *Link* facoltativo:
  un indirizzo (`https://…`, anche senza `https://`), una pagina del sito (`modi.html`), una mail o `@nome` (Instagram).
  Sul sito le etichette sono in maiuscolo. La scheda è in `content/schede/<pagina>.json`; finché non la salvi la prima volta resta quella
  scritta nel testo della pagina. Anche il blocco *Scheda dati* delle Pagine ha il link facoltativo.
- **Modifica sull'anteprima**: nell'anteprima a destra i testi che corrispondono a un campo si evidenziano al passaggio del mouse.
  Un clic su un paragrafo semplice lo modifica lì (Invio o Esc per finire) e il campo a sinistra segue; un testo con grassetto,
  corsivo o link porta al suo campo. Un clic su una foto la mostra nel pannello. Poi *Salva e pubblica* come sempre.
- **Video**: nelle Pagine c'è il blocco **Video** (link YouTube o Vimeo, oppure *Carica un file* mp4/webm/mov fino a 50 MB, con didascalia
  e opzione a tutta larghezza) e nella **Sequenza foto** *+ Video (link)* / *+ Video (file)* aggiungono un video tra le foto.
  Nei progetti fotografici, sotto la sequenza, *+ Aggiungi video* mette un video tra le foto (come *+ Aggiungi testo*: si sposta con ↑ ↓
  o trascinandolo). I file finiscono in `media/<pagina>/` (tolti quando nessun blocco li usa più); YouTube si apre senza cookie.
  Per video lunghi meglio YouTube o Vimeo: il file pesa sul sito.
- **Libreria foto** (nell'albero): tutte le foto del sito divise per cartella, con ricerca. Clic su una foto:
  clic sull'immagine = **punto di fuoco** (il punto che resta in vista quando il sito taglia la foto: hero, griglia della home,
  copertine in alto; *Centro* lo toglie); **Ritaglio** sceglie un formato (1:1, 4:5, 3:2…) e lo zoom, il riquadro si centra sul punto
  di fuoco e *Ritaglia* taglia davvero il file (si annulla dalla Cronologia). Poi *Salva e pubblica*.
  Per **riusare** una foto in un'altra pagina: accanto a ogni *Sostituisci* / *+ Aggiungi foto* (anche nei blocchi delle Pagine)
  c'è *Dalla libreria*: la foto viene copiata nella pagina senza ricaricarla, con il suo punto di fuoco.
  I punti di fuoco sono in `content/fuochi.json` (`{"img/x/01.jpg": [x%, y%]}`) e seguono le foto quando cambi l'ordine.
- **Google e condivisione**: in ogni pagina (Home, progetti, Bohème, modì, AI, About, Archivio, Pagine) puoi scrivere il titolo
  (fino a 60 caratteri) e la descrizione (fino a 155) che Google mostra, e scegliere l'immagine dell'anteprima quando la pagina
  viene condivisa (*Dalla libreria* o *Carica una foto*, ideale orizzontale 1200 × 630). Vuoto = automatico: titolo e descrizione
  della pagina, copertina come immagine. Le anteprime "Su Google" e "Condivisa" si aggiornano mentre scrivi.
  È `content/seo.json`; le foto caricate qui vanno in `img/seo/`.
- **Cronologia**: in fondo a ogni elemento, *Mostra le versioni precedenti* elenca i salvataggi (data e cosa è cambiato).
  *Torna a questa versione* riporta testi, foto e layout di quell'elemento com'erano dopo quel salvataggio; *Annulla questo salvataggio*
  (sulla versione attuale) torna a prima dell'ultimo. Il resto del sito non cambia: i testi in file condivisi (es. `docs/CONTENUTI.md`)
  vengono ripristinati campo per campo. Anche il ripristino è un salvataggio, quindi si può annullare a sua volta.
- **Archivio**: aggiungi o togli foto e scrivi pellicola, luogo e anno sotto ciascuna.
- **Ordine delle sezioni**: in *Home*, ↑ ↓ spostano Pellicole, Ricerca visiva, Progetti con l'AI e la banda Archivio
  (l'hero resta sempre in alto). L'ordine è `ordine` in `content/home.json`.
- **Pagine**: pagine nuove composte con i blocchi della pagina *Componenti* di Figma (vedi `docs/COMPONENTI.md`).
  *+ Nuova pagina* chiede il titolo e la crea (online come `<titolo>.html`). Nella pagina, *+ Aggiungi un blocco qui…* inserisce un blocco
  in quel punto: **Titolo pagina**, **Foto grande** (larga o a tutta pagina), **Testo** (con nota in piccolo), **Citazione**, **Scheda dati**
  (righe etichetta / valore), **Sequenza foto** (con uno dei layout, anche quelli salvati), **Altri progetti** (automatico), **Progetto successivo**
  (link a un'altra pagina), **Fascia** (Pellicole o Archivio). ↑ ↓ spostano un blocco, × lo toglie. Le foto si caricano dentro il blocco
  (o trascinandole dal Finder) e finiscono in `img/<pagina>/`; quelle che nessun blocco usa più vengono tolte al salvataggio.
  La pagina è in `content/pagine/<pagina>.json`. Per ora non compare nei menu: si raggiunge dal suo indirizzo o da un blocco *Progetto successivo*.
- **Pagina in costruzione**: ogni elemento con una pagina sua (progetti, Bohème, modì, AI, About, Archivio, Pagine) ha in alto
  l'interruttore *Pagina in costruzione*. Acceso = chi apre la pagina vede solo l'avviso "Pagina in costruzione" (stile della pagina 404,
  con menu e footer, non indicizzata da Google); nell'albero l'elemento ha la scritta *in costruzione*. L'elenco è `in_costruzione` in `content/sito.json`.
- **Impostazioni**: le parti che compaiono in più pagine. Email, Instagram, Lomography e LinkedIn (vuoto = non compare),
  la riga in fondo al footer (copyright, credito, partita IVA: una riga vuota non compare), titolo e anni di Bohème e modì
  (l'anno della pagina e quello accanto al titolo in home), titolo, descrizione, stato e anno dei progetti con l'AI.
  Tutto è in `content/sito.json`.
- **Stile del sito** (in fondo a *Impostazioni*): font (Hanken Grotesk di Figma, Inter, Work Sans, DM Sans, Instrument Sans, Public Sans:
  solo font con corsivo vero e pesi 400-700), colori di sfondo, testo, testo secondario, linee e sfondo del footer,
  *Dimensione del testo* (85-125%) e *Spaziature* (75-150%). Il riquadro di prova mostra subito il risultato.
  Un colore poco leggibile (contrasto sotto 4,5:1, regola AA) blocca il salvataggio con un avviso. *Torna allo stile di Figma* toglie tutto.
  È `stile` in `content/sito.json`; il sito lo applica con un piccolo `<style>` sulle variabili CSS (limiti concordati con 1 · Designer).
- **Testi**: ogni campo è un pezzo della pagina. `**grassetto**`, `_corsivo_`, `[testo del link](https://...)`; un rigo vuoto separa i paragrafi.
  Le frasi con `[DA VERIFICARE]` restano evidenziate sul sito finché non togli la nota.

**Salva e pubblica** salva foto e testi dell'elemento in un colpo solo. Dopo 1-2 minuti compare *Online ✓* e l'anteprima si aggiorna.
Le foto vengono rimpicciolite nel browser prima di partire e perdono GPS e dati della fotocamera.

## 3. Foto da una cartella del Mac

Ogni elemento con foto ha il campo **Cartella sul Mac**: il percorso dentro
`~/porfolio/information_architecture`, per esempio `01home/03ricerca_visiva/01faccini`.
Quando cambi, aggiungi o togli una foto in quella cartella, il Mac la manda al sito da solo.

Nella cartella:

- `cover.jpg` (o un file che inizia con `copertina`, `hero`, `bg_`, `ritratto`) = copertina;
  se non c'è, la copertina è la prima foto;
- tutte le altre foto, in ordine di nome (`01.jpg`, `02.jpg` ...; vale anche la sottocartella `images`) = la sequenza della pagina;
- per le foto singole (home, ritratto) basta un file nella cartella.

Vince l'ultima modifica: se carichi una copertina dal pannello e poi cambi il file nella cartella, il sito mostra quella della cartella, e viceversa.

**Installazione (una volta sola)**, sul Mac:

1. Apri la cartella `porfolio/sync-sito` nel Finder.
2. Doppio clic su **installa-sync.command**. Se macOS dice che non può aprirlo: tasto destro → *Apri* → *Apri*.
3. Incolla il token del punto 1 e premi Invio (mentre incolli non vedi niente, è normale).
4. Il Terminale mostra le foto che manderebbe: da quel momento il Mac controlla le cartelle ogni 3 minuti.

Altri comandi nella stessa cartella: **sincronizza-ora.command** (manda subito le modifiche),
**disinstalla-sync.command** (toglie la sincronizzazione). Registro: `~/Library/Logs/portfolio-sync.log`.
Quando il Mac invia delle foto compare una notifica "Portfolio".

## Come funziona (per chi sviluppa)

- `admin/index.html` + `admin/admin.js` + `admin/admin.css`: pannello senza dipendenze, che parla con l'API di GitHub
  usando il token salvato nel browser. L'albero e i campi di ogni elemento sono in `admin/struttura.js`.
- I testi restano i file Markdown di `docs/`: ogni campo è una riga `- **Etichetta:** valore` o il testo sotto un titolo `##`/`###`;
  il pannello cambia solo quel pezzo, sulla versione più recente del file.
- Le foto: il pannello scrive direttamente `img/<pagina>/cover.jpg`, `01.jpg` ... (riordinare riusa i file già su GitHub),
  l'archivio in `img/archivio/` + `thumbs/` + `archivio.json`. Ogni salvataggio è un solo commit.
- La cartella del Mac di ogni elemento è in `content/foto/<chiave>.json`, destinazioni in `content/destinazioni.json`.
- `.github/workflows/update-site.yml` a ogni push su `main` che tocca `docs/`, `content/` o `img/`:
  `tools/apply_photos.py` (ripulisce le JPEG con GPS o troppo grandi, importa le foto d'archivio mandate dal Mac),
  `tools/build_pages.py`, `tools/check_site.py`, poi committa le pagine rigenerate e chiede a Pages di ripubblicare.
- La sincronizzazione del Mac è `tools/mac/sync_cartelle.py` (solo libreria standard + `sips`), avviata da launchd
  (`~/Library/LaunchAgents/it.bohememag.portfolio-sync.plist`); il token è nel Portachiavi, voce `portfolio-sync`.
  Toglie dal sito solo le foto che ha mandato lei: quelle aggiunte dal pannello restano.
- Le pagine fotografiche mostrano tante foto quante sono in `img/<pagina>/` (12 segnaposto finché non ce n'è nessuna).

**Foto sostituite.** Quando cambi una foto che mantiene lo stesso nome (es. il ritratto dell'About), il pannello per 15 minuti la mostra direttamente da GitHub, così la vedi subito anche se il sito non è ancora aggiornato. Le pagine del sito chiamano ogni foto con un codice della sua versione (`ritratto.jpg?v=…`): appena il sito si aggiorna, il browser scarica la foto nuova invece di mostrare quella vecchia salvata in memoria.

**About.** "Dati accanto al ritratto" modifica le voci accanto alla foto (Base, Ambiti, Contatti, Lingue…): testo, link, voci nuove, da togliere o da spostare (`content/schede/about.json`). Mentre scrivi la frase d'apertura e la bio, l'anteprima a destra si aggiorna subito, prima ancora di salvare. Tutte le sezioni della bio hanno lo stesso stile di testo, in qualunque posizione si trovino.
