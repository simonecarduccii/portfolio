# Pubblicazione

Il sito è statico (HTML, CSS, JS): nessun server, nessun database. È ospitato gratis su
**GitHub Pages** dal repository `simonecarduccii/simonecarducci`, branch `main`, cartella principale.

## 1. Attivare GitHub Pages (una volta sola)

1. Apri [Settings → Pages](https://github.com/simonecarduccii/simonecarducci/settings/pages).
2. In **Build and deployment → Source** scegli **Deploy from a branch**.
3. Branch: **main**, cartella: **/ (root)**. Salva.
4. Dopo 1–2 minuti il sito è online.

**Indirizzo attuale: https://bohememag.it/simonecarducci/**. Il sito utente
`simonecarduccii.github.io` ha come dominio personalizzato `bohememag.it`, quindi GitHub
pubblica ogni repository con Pages sotto `bohememag.it/<nome-repo>/` e
`simonecarduccii.github.io/simonecarducci/` rimanda lì. Non serve nessun record DNS in più.
Se una modifica non si vede, aspetta 1–2 minuti e ricarica senza cache (Cmd+Shift+R).

Per avere HTTPS su tutto: nel repository `simonecarduccii.github.io` →
Settings → Pages → spunta **Enforce HTTPS** (oggi il rimando da github.io va su `http://`).

La sezione 2 serve solo se in futuro vuoi un dominio tutto suo (es. `simonecarducci.it`).

Ogni push su `main` ripubblica il sito da solo. Il file `.nojekyll` dice a GitHub di
pubblicare i file così come sono.

### Cambio di indirizzo da /portfolio a /simonecarducci (10/11/2026)

L'indirizzo sotto bohememag.it è il nome del repository. Per passare a
`bohememag.it/simonecarducci/`:

1. [Settings → General](https://github.com/simonecarduccii/portfolio/settings) → **Repository name**:
   `simonecarducci` → **Rename**. GitHub sposta da solo il sito e reindirizza i vecchi link
   al repository (git, API), ma **non** le pagine di bohememag.it/portfolio/.
2. Unisci la PR che aggiorna `/admin`, la sincronizzazione dal Mac, la 404 e la sitemap.
3. I vecchi link `bohememag.it/portfolio/...` li reindirizza il sito principale
   (repository `simonecarduccii.github.io`, cartella `portfolio/`), una pagina per ogni pagina.
4. Sul Mac la sincronizzazione segue il nuovo nome da sola. Per tenere allineata la copia locale:
   `git remote set-url origin https://github.com/simonecarduccii/simonecarducci.git`.

## 2. Collegare il dominio (OVHcloud)

Esempio con `simonecarducci.it` (sostituisci con il dominio che compri).

**Su OVHcloud** → Web Cloud → Nomi di dominio → il tuo dominio → **Zona DNS**:

1. Elimina i record `A` e `AAAA` già presenti per il dominio senza `www`
   (quelli che OVH crea di default verso la sua pagina di parcheggio), e il record
   `CNAME` o `A` di `www` se c'è.
2. Aggiungi questi record:

| Tipo  | Sottodominio | Destinazione              |
|-------|--------------|---------------------------|
| A     | _(vuoto)_    | 185.199.108.153           |
| A     | _(vuoto)_    | 185.199.109.153           |
| A     | _(vuoto)_    | 185.199.110.153           |
| A     | _(vuoto)_    | 185.199.111.153           |
| AAAA  | _(vuoto)_    | 2606:50c0:8000::153       |
| AAAA  | _(vuoto)_    | 2606:50c0:8001::153       |
| AAAA  | _(vuoto)_    | 2606:50c0:8002::153       |
| AAAA  | _(vuoto)_    | 2606:50c0:8003::153       |
| CNAME | www          | simonecarduccii.github.io. |

**Su GitHub** → [Settings → Pages](https://github.com/simonecarduccii/simonecarducci/settings/pages)
→ **Custom domain**: scrivi `simonecarducci.it` e salva. GitHub crea il file `CNAME` nel repo.
Quando il controllo DNS è verde (da pochi minuti a qualche ora), spunta **Enforce HTTPS**.

Consigliato: in [Settings → Pages del tuo profilo](https://github.com/settings/pages)
verifica il dominio, così nessun altro può usarlo su GitHub.

Poi aggiorna sitemap e robots con il dominio vero:

```bash
python3 tools/build_sitemap.py https://simonecarducci.it
```

## 3. Lavorare dal Mac

```bash
cd ~/Documents            # o dove preferisci
git clone https://github.com/simonecarduccii/simonecarducci.git
cd simonecarducci
open index.html           # anteprima nel browser
# oppure, per provarlo come sarà online:
python3 -m http.server 8000   # poi apri http://localhost:8000
```

Per pubblicare una modifica: `git add -A && git commit -m "Update texts" && git push`.
In alternativa puoi usare [GitHub Desktop](https://desktop.github.com/).

## 4. Aggiungere le foto

Le foto vanno sempre passate dallo script, che le ridimensiona (2000 px sul lato lungo, 1800 per l'archivio),
le raddrizza e **toglie i metadati, compresa la posizione GPS**. Gli originali non vengono toccati.

```bash
pip3 install pillow                                   # una volta sola
python3 tools/optimize_images.py ~/Desktop/archivio archivio
python3 tools/optimize_images.py ~/Desktop/siculo siculo
```

- **Archivio**: le foto diventano `img/archivio/0001.jpg`, `0002.jpg`… (numerate dopo
  l'ultima già presenti, quindi importa ogni gruppo una volta sola), con le miniature a 900 px
  in `img/archivio/thumbs/`. Lo script aggiorna `img/archivio/archivio.json`, la lista da cui
  la pagina pesca la foto a caso. `film`, `luogo` e `anno` si scrivono a mano in quel file:
  lo script li conserva. Formato concordato con il design (vedi `docs/DESIGN.md`).
- **Progetti** (`boheme`, `modi`, `siculo`, `faccioni`, `place-of-freedom`,
  `papa-che-fanno-i-papa`, `about`): le foto vengono rinominate `cover.jpg`, `01.jpg`,
  `02.jpg`… in ordine di nome. Se un file si chiama `cover…` diventa la copertina.

**Video** (es. hero di modì): `python3 tools/optimize_video.py ~/Desktop/modi.mov modi`
crea `img/modi/hero.mp4` (H.264, muto, max 1920 px, sotto 4 MB, max 15 s) e `hero-poster.jpg`.
Serve ffmpeg: `brew install ffmpeg`.

Le foto di Lomography vanno scaricate dal tuo profilo e messe in una cartella: il sito
di Lomography non si può leggere in automatico.

## 5. Controllo prima di pubblicare

```bash
python3 tools/check_site.py            # link rotti, immagini troppo pesanti, alt mancanti
python3 tools/check_site.py --strict   # versione finale: anche foto e CV mancanti sono errori
```

Lo stesso controllo gira da solo su GitHub a ogni push (tab **Actions**).

## Contatti

Il sito usa un link `mailto:` per le email: funziona ovunque, senza servizi esterni né
spam da gestire. Se in futuro serve un modulo, la via più semplice è Formspree (gratis
fino a 50 messaggi al mese).
