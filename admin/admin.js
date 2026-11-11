// Admin of the portfolio: browse the site by its information architecture (admin/struttura.js)
// and edit the texts and photos of each element together. Saving makes one commit on GitHub;
// the Action "Update site" then rebuilds the pages and GitHub Pages publishes them.
// No server: the browser talks to the GitHub API with Simone's token (kept in this browser only).
(function () {
  "use strict";

  const REPO = "simonecarduccii/simonecarducci";
  const BRANCH = "main";
  const API = "https://api.github.com";
  const SITE = "../"; // the admin lives at <site>/admin/
  const KEY = "portfolio-admin-token";
  const MAX_SIDE = 2000, ARCHIVE_SIDE = 1800, THUMB_SIDE = 900, QUALITY = 0.86;

  const $ = (sel, el = document) => el.querySelector(sel);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  };

  let token = null;
  let tree = {};         // path -> blob sha, for the whole repo at the last load
  const texts = {};      // path -> file content at the last load
  let current = null;    // element being edited
  let draft = null;      // its pending changes

  // ------------------------------------------------------------------ GitHub

  async function gh(method, path, body) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  async function loadTree() {
    const ref = await gh("GET", `/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const commit = await gh("GET", `/repos/${REPO}/git/commits/${ref.object.sha}`);
    const t = await gh("GET", `/repos/${REPO}/git/trees/${commit.tree.sha}?recursive=1`);
    tree = {};
    t.tree.forEach((e) => { if (e.type === "blob") tree[e.path] = e.sha; });
    return ref.object.sha;
  }

  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  async function readText(path, fresh) {
    if (!fresh && texts[path] != null) return texts[path];
    if (!tree[path]) return "";
    const blob = await gh("GET", `/repos/${REPO}/git/blobs/${tree[path]}`);
    texts[path] = b64ToText(blob.content);
    return texts[path];
  }

  async function blobFrom(data) {
    // data: {text} or {blob: Blob}
    if (data.text != null) return (await gh("POST", `/repos/${REPO}/git/blobs`, { content: data.text, encoding: "utf-8" })).sha;
    const b64 = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.readAsDataURL(data.blob); });
    return (await gh("POST", `/repos/${REPO}/git/blobs`, { content: b64, encoding: "base64" })).sha;
  }

  // changes: async (freshReader) => {path: sha | null}. Retried on a fresh head if someone pushed meanwhile.
  async function commit(message, build) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const head = await loadTree();
      const changes = await build();
      const entries = Object.entries(changes).map(([path, sha]) => ({ path, mode: "100644", type: "blob", sha }));
      if (!entries.length) return null;
      const base = (await gh("GET", `/repos/${REPO}/git/commits/${head}`)).tree.sha;
      const t = await gh("POST", `/repos/${REPO}/git/trees`, { base_tree: base, tree: entries });
      const c = await gh("POST", `/repos/${REPO}/git/commits`, { message, tree: t.sha, parents: [head] });
      try {
        await gh("PATCH", `/repos/${REPO}/git/refs/heads/${BRANCH}`, { sha: c.sha });
        await loadTree();
        return c.sha;
      } catch (e) {
        if (e.status !== 422 || attempt === 2) throw e;
      }
    }
  }

  // ------------------------------------------------------------------ Markdown fields

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const level = (line) => (line.match(/^(#{1,6}) /) || [, ""])[1].length;

  function sectionRange(lines, heading, from = 0, to = lines.length) {
    const lv = level(heading);
    const i = lines.findIndex((l, n) => n >= from && n < to && l.startsWith(heading));
    if (i < 0) return null;
    let j = i + 1;
    while (j < to && !(level(lines[j]) && level(lines[j]) <= lv)) j++;
    return [i, j];
  }

  function metaLine(lines, key, scope) {
    let [a, b] = [0, lines.length];
    if (scope) { const r = sectionRange(lines, scope); if (!r) return -1; [a, b] = r; }
    const re = new RegExp("^\\s*- \\*\\*" + esc(key) + "[^*]*:\\*\\*");
    for (let n = a; n < b; n++) if (re.test(lines[n])) return n;
    return -1;
  }

  function getField(text, f) {
    const lines = text.split("\n");
    if (f.meta) {
      const n = metaLine(lines, f.meta, f.in);
      return n < 0 ? null : lines[n].replace(/^\s*- \*\*[^*]+:\*\*\s?/, "");
    }
    const r = sectionRange(lines, f.section);
    return r ? lines.slice(r[0] + 1, r[1]).join("\n").trim() : null;
  }

  function setField(text, f, value) {
    const lines = text.split("\n");
    if (f.meta) {
      const n = metaLine(lines, f.meta, f.in);
      if (n < 0) return text;
      lines[n] = lines[n].match(/^\s*- \*\*[^*]+:\*\*/)[0] + " " + value.replace(/\n+/g, " ").trim();
      return lines.join("\n");
    }
    const r = sectionRange(lines, f.section);
    if (!r) return text;
    const body = value.trim() ? ["", ...value.trim().split("\n"), ""] : [""];
    lines.splice(r[0] + 1, r[1] - r[0] - 1, ...body);
    return lines.join("\n");
  }

  // {sections: file}: every meta line before the first "## " and every "## " section, for the AI sheets.
  function expandFields(spec, text) {
    if (!spec.sections) return [spec];
    const lines = text.split("\n");
    const out = [];
    const first = lines.findIndex((l) => level(l) === 2);
    lines.slice(0, first < 0 ? lines.length : first).forEach((l) => {
      const m = l.match(/^- \*\*([^*]+?):\*\*/);
      if (m && !m[1].startsWith("Immagine")) out.push({ label: m[1], file: spec.sections, meta: m[1] });
    });
    lines.forEach((l) => {
      if (level(l) === 2) out.push({ label: l.slice(3), file: spec.sections, section: l, rows: 6 });
    });
    return out;
  }

  // ------------------------------------------------------------------ images

  async function toJpeg(file, side) {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    // re-encoding drops every metadata block (GPS, camera)
    return new Promise((ok) => c.toBlob(ok, "image/jpeg", QUALITY));
  }

  const siteUrl = (path) => SITE + path + (tree[path] ? "?v=" + tree[path].slice(0, 8) : "");

  // ------------------------------------------------------------------ sidebar

  function flatten(nodes, parent, out = []) {
    nodes.forEach((n) => { n.parent = parent; out.push(n); if (n.children) flatten(n.children, n, out); });
    return out;
  }
  let ALL = flatten(window.STRUTTURA, null);

  // Ricerca visiva follows content/home.json: same order, titles and visibility as the home grid.
  async function applyHome() {
    let data = { ricerca_visiva: [] };
    try { data = JSON.parse(await readText("content/home.json", true) || "{}"); } catch (e) { /* keep empty */ }
    const group = ALL.find((n) => n.homeList);
    group.children = (data.ricerca_visiva || []).map((r) => {
      const doc = r.pagina && ((window.PROGETTI_FOTO || {})[r.pagina] || (tree[`docs/progetti/${r.pagina}.md`] ? r.pagina : null));
      const n = doc ? window.photoProject(r.pagina, doc, r.titolo)
        : { id: r.id, title: r.titolo, page: "index.html#ricerca-visiva", noPage: true,
            note: "Questo progetto non ha ancora una pagina: se lo accendi, in home compare la sua scheda con la scritta “foto in arrivo”." };
      n.switchKey = "rv:" + r.id;
      n.hidden = r.visibile === false;
      return n;
    });
    // Home sections and the two hero projects can be switched on and off
    const home = ALL.find((n) => n.id === "home");
    const hero = ALL.find((n) => n.id === "hero");
    const sez = data.sezioni || {};
    [...home.children, ...hero.children].forEach((n) => { n.switchKey = n.id; n.hidden = sez[n.id] === false; });
    ALL = flatten(window.STRUTTURA, null);
    return data;
  }

  function renderNav() {
    const list = (nodes, depth) => h("ul", { class: "tree d" + depth }, nodes.map((n) => h("li", {},
      h("button", {
        type: "button", class: "node" + (n.hidden ? " hidden" : "") + (current === n ? " on" : "") + (n.group ? " group" : ""),
        title: n.hidden ? "Spento: non compare in home" : null,
        onclick: () => open(n),
      }, n.title, n.hidden ? h("span", { class: "tag" }, "spento") : null),
      n.children ? list(n.children, depth + 1) : null)));
    $("#nav").replaceChildren(list(window.STRUTTURA, 0));
  }

  // ------------------------------------------------------------------ element view

  async function open(node) {
    if (draft && draft.dirty && !confirm("Hai modifiche non salvate. Le perdi?")) return;
    current = node;
    location.hash = node.id;
    renderNav();
    const main = $("#main");
    main.replaceChildren(h("p", { class: "muted" }, "Carico…"));
    try {
      draft = { dirty: false, texts: {}, photos: null, cartella: null, switches: {} };
      const view = await renderElement(node);
      main.replaceChildren(view);
      setPreview(node.page);
    } catch (e) {
      main.replaceChildren(h("p", { class: "error" }, "Non riesco a caricare: " + e.message));
    }
  }

  function markDirty() {
    draft.dirty = true;
    $("#save").disabled = false;
    $("#save-state").textContent = "Modifiche non salvate";
  }

  async function renderElement(node) {
    const path = [];
    for (let p = node.parent; p; p = p.parent) path.unshift(p.title);
    const head = h("header", { class: "el-head" },
      h("p", { class: "crumbs" }, path.join(" / ")),
      h("h1", {}, node.title),
      node.page ? h("a", { class: "open-page", href: SITE + node.page, target: "_blank", rel: "noopener" }, "Apri la pagina ↗") : null,
      node.switchKey ? h("div", { class: "head-switch" }, toggle(!node.hidden, (v) => { draft.switches[node.switchKey] = v; markDirty(); }), h("span", {}, "Visibile in home")) : null,
      node.note ? h("p", { class: "note" }, node.note) : null);

    const body = h("div", { class: "el-body" });
    if (node.photos) body.append(await photoPanel(node));
    if (node.texts) body.append(await textPanel(node));
    if (node.settings) body.append(await settingsPanel());
    if (node.id === "home") body.append(await orderPanel());
    if (node.homeList) body.append(await homePanel());
    else if (node.children) {
      body.append(h("section", { class: "panel" }, h("h2", {}, "Dentro questa sezione"),
        h("div", { class: "cards" }, node.children.map((c) => h("div", { class: "card-wrap" + (c.hidden ? " off" : "") },
          h("button", { type: "button", class: "card", onclick: () => open(c) }, cardImage(c), h("span", {}, c.title)),
          c.switchKey ? h("div", { class: "card-switch" }, toggle(!c.hidden, (v, el) => {
            draft.switches[c.switchKey] = v; el.closest(".card-wrap").classList.toggle("off", !v); markDirty();
          }), h("span", {}, "In home")) : null)))));
    }
    const bar = h("div", { class: "savebar" },
      h("span", { id: "save-state", class: "muted" }, "Nessuna modifica"),
      h("button", { id: "save", type: "button", class: "primary", disabled: true, onclick: save }, "Salva e pubblica"));
    const editable = node.photos || node.texts || node.homeList || node.settings || node.switchKey || (node.children || []).some((c) => c.switchKey);
    return h("div", {}, head, body, editable ? bar : null);
  }

  // An on/off switch: a checkbox with role="switch", styled in admin.css
  function toggle(checked, onChange) {
    const input = h("input", { type: "checkbox", role: "switch" });
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked, input));
    return h("label", { class: "switch" }, input, h("span", { class: "knob", "aria-hidden": "true" }));
  }

  function cardImage(c) {
    if (!c.photos && c.children) {
      const first = c.children.find((k) => k.photos);
      if (first) return cardImage(first);
    }
    const src = c.photos && (c.photos.kind === "serie" ? `${c.photos.dir}/cover.jpg` : c.photos.file);
    return src && tree[src] ? h("img", { src: siteUrl(src), alt: "", loading: "lazy" }) : h("span", { class: "ph" });
  }

  // ---------------------------------------------------------------- home grid (Ricerca visiva)

  // Shapes a project's cover can take in the home grid ("" = the one in the design)
  const FORMATS = [["", "come da design"], ["3:2", "3:2 orizzontale"], ["4:3", "4:3 orizzontale"], ["6:5", "6:5 orizzontale"], ["16:9", "16:9 panoramica"],
    ["1:1", "1:1 quadrata"], ["5:6", "5:6 verticale"], ["3:4", "3:4 verticale"], ["2:3", "2:3 verticale"]];

  async function homePanel() {
    const data = await applyHome();
    const list = (data.ricerca_visiva || []).map((r) => ({ ...r }));
    draft.home = { data, list };
    const ul = h("ol", { class: "home-list" });
    const draw = () => ul.replaceChildren(...list.map((r, i) => {
      const cover = r.pagina && `img/${r.pagina}/cover.jpg`;
      const title = h("input", { type: "text", value: r.titolo, "aria-label": "Titolo" });
      title.addEventListener("input", () => { r.titolo = title.value; markDirty(); });
      const year = h("input", { type: "text", value: r.anno, class: "year", "aria-label": "Anno" });
      year.addEventListener("input", () => { r.anno = year.value; markDirty(); });
      const vis = toggle(r.visibile !== false, (v) => { r.visibile = v; li.classList.toggle("off", !v); markDirty(); });
      const thumb = cover && tree[cover] ? h("img", { src: siteUrl(cover), alt: "" }) : h("span", { class: "ph" }, "foto in arrivo");
      const shape = () => { // preview the chosen shape inside a 96 x 64 box
        const [w, hh] = (r.formato || "3:2").split(":").map(Number), k = w / hh;
        thumb.style.width = `${Math.round(k >= 1.5 ? 96 : 64 * k)}px`;
        thumb.style.height = `${Math.round(k >= 1.5 ? 96 / k : 64)}px`;
      };
      shape();
      const fmt = h("select", { "aria-label": "Formato in home", title: "Formato della foto nella griglia della home (non cambia la pagina del progetto)" },
        ...FORMATS.map(([v, t]) => h("option", { value: v }, t)));
      fmt.value = FORMATS.some(([v]) => v === (r.formato || "")) ? (r.formato || "") : "";
      fmt.addEventListener("change", () => { if (fmt.value) r.formato = fmt.value; else delete r.formato; shape(); markDirty(); });
      const li = h("li", { draggable: "true", class: r.visibile === false ? "off" : null },
        h("span", { class: "grip", title: "Trascina per spostare" }, "⋮⋮"),
        h("div", { class: "thumb" }, thumb),
        h("div", { class: "home-fields" }, title, year, h("label", { class: "fmt" }, "Formato in home ", fmt),
          h("small", {}, r.pagina ? `pagina ${r.pagina}.html` : "ancora senza pagina")),
        h("div", { class: "ctl" }, h("label", { class: "vis" }, vis, " In home"),
        h("span", { class: "tools" },
          h("button", { type: "button", title: "Su", onclick: () => move(i, i - 1) }, "↑"),
          h("button", { type: "button", title: "Giù", onclick: () => move(i, i + 1) }, "↓"),
          h("button", { type: "button", title: "Apri", onclick: () => open(ALL.find((n) => n.id === (r.pagina || r.id))) }, "Apri"),
          r.pagina ? null : h("button", { type: "button", title: "Crea la pagina del progetto (testi, foto, layout)", onclick: () => createProject(r) }, "Crea pagina"),
          h("button", { type: "button", class: "danger", title: "Elimina il progetto", onclick: () => deleteProject(r) }, "Elimina"))));
      li.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/x-home", String(i)); li.classList.add("dragging"); });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("text/x-home")) e.preventDefault(); });
      li.addEventListener("drop", (e) => { const from = e.dataTransfer.getData("text/x-home"); if (from !== "") { e.preventDefault(); move(+from, i); } });
      return li;
    }));
    const move = (a, b) => {
      if (b < 0 || b >= list.length) return;
      const [it] = list.splice(a, 1); list.splice(b, 0, it); draw(); markDirty();
    };
    draw();
    return h("section", { class: "panel" }, h("h2", {}, "Progetti in home"),
      h("p", { class: "hint" }, "Trascina per cambiare l'ordine della griglia (il primo è in alto a sinistra). Spegni l'interruttore per toglierlo dalla home. Il titolo è anche quello della pagina del progetto."),
      ul,
      h("button", { type: "button", class: "btn add-project", onclick: () => createProject(null) }, "+ Nuovo progetto"));
  }

  // ---------------------------------------------------------------- new / deleted photo projects
  // A project = an entry in content/home.json + docs/progetti/<slug>.md (texts) + img/<slug>/ (photos).
  // tools/build_pages.py makes a page for every entry whose sheet exists.

  const RESERVED = ["index", "about", "archivio", "ai", "boheme", "modi", "vedetta", "coaching", "admin", "404",
    "assets", "img", "docs", "content", "tools", "_template"];
  const slugify = (t) => (t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)) || "progetto";
  const projectSheet = (title, year) => `# ${title}

- **Anno:** ${year}
- **Fotografia:** Simone Carducci
- **Supporto:** Pellicola
- **Fotocamera:** –
- **Pellicola:** –
- **Luogo:** –

## Intro in testata (max 40 parole)

Testo da scrivere.

## Testo in fondo, dopo le foto (80–150 parole)

Testo da scrivere.

## Crediti

Fotografie e testo: Simone Carducci · ${year}
`;
  const unsaved = () => draft.dirty && !confirm("Ci sono modifiche non salvate in questa scheda: se continui le perdi. Continuare?");
  const asJson = (v) => JSON.stringify(v, null, 2) + "\n";

  async function createProject(existing) {
    if (unsaved()) return;
    const title = existing ? existing.titolo : (prompt("Titolo del nuovo progetto") || "").trim();
    if (!title) return;
    const year = existing ? existing.anno : (prompt("Anno (o periodo, es. 2025 - attuale)", String(new Date().getFullYear())) || "").trim();
    if (year === null) return;
    const st = $("#save-state");
    if (st) st.textContent = "Creo il progetto…";
    let slug = null;
    try {
      const sha = await commit(`Create ${title} from admin`, async () => {
        const home = JSON.parse(await readText("content/home.json", true) || "{}");
        const list = home.ricerca_visiva = home.ricerca_visiva || [];
        const base = slugify(existing ? existing.id : title);
        const taken = (s) => RESERVED.includes(s) || tree[`docs/progetti/${s}.md`] || tree[`${s}.html`] ||
          list.some((r) => r.pagina === s || (r.id === s && !(existing && r.id === existing.id)));
        slug = base;
        for (let k = 2; taken(slug); k++) slug = `${base}-${k}`;
        if (existing) {
          const r = list.find((x) => x.id === existing.id);
          if (!r) throw new Error("progetto non trovato in content/home.json");
          r.pagina = slug;
        } else {
          list.push({ id: slug, titolo: title, anno: year, pagina: slug, visibile: false });
        }
        const dest = JSON.parse(await readText("content/destinazioni.json", true) || "{}");
        dest[slug] = { tipo: "serie", destinazione: `img/${slug}` };
        return {
          "content/home.json": await blobFrom({ text: asJson(home) }),
          "content/destinazioni.json": await blobFrom({ text: asJson(dest) }),
          [`docs/progetti/${slug}.md`]: await blobFrom({ text: projectSheet(title, year) }),
        };
      });
      draft.dirty = false;
      await applyHome(); renderNav();
      const node = ALL.find((n) => n.id === slug);
      if (node) await open(node);
      const s2 = $("#save-state");
      if (s2) s2.textContent = "Progetto creato (spento in home finché non lo accendi). La pagina è online in 1-2 minuti…";
      if (sha && node) waitPublished(sha, node);
    } catch (e) {
      if (st) st.textContent = "";
      alert("Non sono riuscito a creare il progetto: " + e.message);
    }
  }

  async function deleteProject(r) {
    if (unsaved()) return;
    const msg = r.pagina
      ? `Eliminare “${r.titolo}”? Spariscono dalla home e dal sito la sua pagina, i testi e le foto (restano recuperabili nella cronologia di GitHub).`
      : `Togliere “${r.titolo}” dalla lista dei progetti?`;
    if (!confirm(msg)) return;
    const st = $("#save-state");
    if (st) st.textContent = "Elimino…";
    try {
      const sha = await commit(`Delete ${r.titolo} from admin`, async () => {
        const out = {};
        const home = JSON.parse(await readText("content/home.json", true) || "{}");
        home.ricerca_visiva = (home.ricerca_visiva || []).filter((x) => x.id !== r.id);
        out["content/home.json"] = await blobFrom({ text: asJson(home) });
        const p = r.pagina;
        if (p && !RESERVED.includes(p) && !home.ricerca_visiva.some((x) => x.pagina === p)) {
          Object.keys(tree).forEach((path) => {
            if (path === `docs/progetti/${p}.md` || path.startsWith(`img/${p}/`) || path === `content/layout/${p}.json` ||
                path === `content/foto/${p}.json` || path === `content/.stato/${p}.json` || path === `${p}.html`) out[path] = null;
          });
          const dest = JSON.parse(await readText("content/destinazioni.json", true) || "{}");
          if (dest[p]) { delete dest[p]; out["content/destinazioni.json"] = await blobFrom({ text: asJson(dest) }); }
        }
        return out;
      });
      draft.dirty = false;
      await applyHome(); renderNav();
      const group = ALL.find((n) => n.homeList);
      await open(group);
      const s2 = $("#save-state");
      if (s2) s2.textContent = "Eliminato. Il sito si aggiorna in 1-2 minuti…";
      if (sha) waitPublished(sha, group);
    } catch (e) {
      if (st) st.textContent = "";
      alert("Non sono riuscito a eliminare il progetto: " + e.message);
    }
  }

  // ---------------------------------------------------------------- order of the home sections

  // Same keys as HOME_SECTIONS in tools/build_pages.py; the hero always stays on top.
  const HOME_SECTIONS = [["pellicole", "Pellicole (banda a colori)"], ["ricerca-visiva", "Ricerca visiva"],
    ["ia", "Progetti con l'AI"], ["banda-archivio", "Archivio (banda in bianco e nero)"]];

  async function orderPanel() {
    const data = JSON.parse(await readText("content/home.json", true) || "{}");
    const keys = HOME_SECTIONS.map(([k]) => k);
    const order = (data.ordine || []).filter((k) => keys.includes(k));
    keys.forEach((k) => { if (!order.includes(k)) order.push(k); });
    draft.order = order;
    const ol = h("ol", { class: "order-list" });
    const move = (a, b) => {
      if (b < 0 || b >= order.length) return;
      const [k] = order.splice(a, 1); order.splice(b, 0, k); draft.orderDirty = true; draw(); markDirty();
    };
    const draw = () => ol.replaceChildren(
      h("li", { class: "fixed" }, h("span", {}, "Hero (Bohème e modì)"), h("small", {}, "sempre in alto")),
      ...order.map((k, i) => h("li", { class: data.sezioni && data.sezioni[k] === false ? "off" : null },
        h("span", {}, HOME_SECTIONS.find(([x]) => x === k)[1], data.sezioni && data.sezioni[k] === false ? h("small", {}, " (spenta)") : null),
        h("span", { class: "tools" },
          h("button", { type: "button", title: "Su", "aria-label": "Sposta su", disabled: i === 0 ? "" : null, onclick: () => move(i, i - 1) }, "↑"),
          h("button", { type: "button", title: "Giù", "aria-label": "Sposta giù", disabled: i === order.length - 1 ? "" : null, onclick: () => move(i, i + 1) }, "↓")))));
    draw();
    return h("section", { class: "panel" }, h("h2", {}, "Ordine delle sezioni"),
      h("p", { class: "hint" }, "L'ordine in cui le sezioni compaiono in home, sotto l'hero. Per spegnerne una usa gli interruttori qui sotto."), ol);
  }

  // ---------------------------------------------------------------- site settings (content/sito.json)

  const SITO_FILE = "content/sito.json";
  const SITO_FORM = [
    { title: "Contatti e link", hint: "Valgono in tutto il sito: footer, About, link di Lomography. Lascia LinkedIn vuoto per non mostrarlo.", fields: [
      ["contatti.email", "Email"], ["contatti.instagram", "Instagram (indirizzo completo)"],
      ["contatti.lomography", "Lomography (indirizzo completo)"], ["contatti.linkedin", "LinkedIn (indirizzo completo)"]] },
    { title: "Riga in fondo al footer", hint: "Una riga vuota non compare.", fields: [
      ["footer.copyright", "Copyright"], ["footer.credito", "Credito del sito"], ["footer.piva", "Partita IVA"]] },
    { title: "Bohème Magazine", fields: [["cultura.boheme.titolo", "Titolo"], ["cultura.boheme.anno", "Anno nella pagina"], ["cultura.boheme.anno_home", "Anno accanto al titolo in home"]] },
    { title: "Colectivo modì", fields: [["cultura.modi.titolo", "Titolo"], ["cultura.modi.anno", "Anno nella pagina"], ["cultura.modi.anno_home", "Anno accanto al titolo in home"]] },
    { title: "Progetti con l'AI (righe della lista)", hint: "In home e nella pagina Progetti con l'AI. Lettura resta privato: niente pagina e niente stato.", fields: [
      ["ai.vedetta.titolo", "Bohème Vedetta · titolo"], ["ai.vedetta.cosa", "Bohème Vedetta · cosa fa"], ["ai.vedetta.stato", "Bohème Vedetta · stato"], ["ai.vedetta.anno", "Bohème Vedetta · anno"],
      ["ai.coaching.titolo", "Running Coach · titolo"], ["ai.coaching.cosa", "Running Coach · cosa fa"], ["ai.coaching.stato", "Running Coach · stato"], ["ai.coaching.anno", "Running Coach · anno"],
      ["ai.lettura.titolo", "Lettura · titolo"], ["ai.lettura.cosa", "Lettura · cosa fa"], ["ai.lettura.anno", "Lettura · anno"]] },
  ];
  const getPath = (o, path) => path.split(".").reduce((x, k) => (x && typeof x === "object" ? x[k] : undefined), o);
  const setPath = (o, path, v) => {
    const ks = path.split("."), last = ks.pop();
    ks.reduce((x, k) => (x[k] = x[k] && typeof x[k] === "object" ? x[k] : {}), o)[last] = v;
  };

  async function settingsPanel() {
    let data = {};
    try { data = JSON.parse(await readText(SITO_FILE, true) || "{}"); } catch (e) { data = {}; }
    draft.sito = {};
    const wrap = h("div", {});
    SITO_FORM.forEach((g) => {
      const panel = h("section", { class: "panel" }, h("h2", {}, g.title), g.hint ? h("p", { class: "hint" }, g.hint) : null);
      g.fields.forEach(([path, label]) => {
        const id = "s" + path.replace(/\W/g, "-");
        const input = h("input", { id, type: path.endsWith("email") ? "email" : path.startsWith("contatti.") && !path.endsWith("email") ? "url" : "text" });
        input.value = getPath(data, path) || "";
        input.addEventListener("input", () => { draft.sito[path] = input.value.trim(); markDirty(); });
        panel.append(h("label", { class: "field", for: id }, h("span", {}, label), input));
      });
      wrap.append(panel);
    });
    return wrap;
  }

  // ---------------------------------------------------------------- texts

  async function textPanel(node) {
    const panel = h("section", { class: "panel" }, h("h2", {}, "Testi"));
    for (const spec of node.texts) {
      const file = spec.file || spec.sections;
      const text = await readText(file);
      for (const f of expandFields(spec, text)) {
        const value = getField(text, f);
        if (value == null) continue;
        const id = "f" + Math.random().toString(36).slice(2, 8);
        const input = (f.rows || value.length > 80)
          ? h("textarea", { id, rows: f.rows || Math.min(12, Math.ceil(value.length / 70) + 1) })
          : h("input", { id, type: "text" });
        input.value = value;
        input.addEventListener("input", () => { draft.texts[file + "\u0000" + (f.meta || f.section) + "\u0000" + (f.in || "")] = { f, value: input.value }; markDirty(); });
        panel.append(h("label", { class: "field", for: id }, h("span", {}, f.label), input,
          /\[DA VERIFICARE/.test(value) ? h("small", { class: "verify" }, "Contiene una nota [DA VERIFICARE], evidenziata sul sito finché non la togli.") : null));
      }
    }
    panel.append(h("p", { class: "hint" }, "**grassetto**, _corsivo_, [testo del link](https://...). Un rigo vuoto separa i paragrafi."));
    return panel;
  }

  // ---------------------------------------------------------------- photos

  async function photoPanel(node) {
    const ph = node.photos;
    const panel = h("section", { class: "panel" }, h("h2", {}, "Foto"));
    if (node.cartella) panel.append(await folderField(node));
    if (ph.kind === "archivio") { panel.append(await archivePanel()); return panel; }

    const coverPath = ph.kind === "serie" ? `${ph.dir}/cover.jpg` : ph.file;
    const state = {
      cover: tree[coverPath] ? { sha: tree[coverPath], url: siteUrl(coverPath) } : null,
      seq: [],
      removed: [],
    };
    if (ph.kind === "serie") {
      Object.keys(tree).filter((p) => p.startsWith(ph.dir + "/") && /^\d{2,}\.jpg$/.test(p.slice(ph.dir.length + 1)))
        .sort().forEach((p) => state.seq.push({ sha: tree[p], url: siteUrl(p) }));
    }
    // Page layout (photo projects): big cover on/off and one of the standard layouts (LAYOUTS)
    let layout = null;
    if (ph.layout) {
      try { layout = JSON.parse(await readText(ph.layout, true) || "{}"); } catch (e) { layout = {}; }
      state.coverBig = layout.copertina !== false;
      await loadMine();
      state.schema = Array.isArray(layout.schema) ? layout.schema : null;
      const known = LAYOUTS.some((l) => l.id === layout.layout) || MINE.some((l) => l.id === layout.layout) || (layout.layout === "casuale" && state.schema);
      state.layout = known ? layout.layout : LAYOUTS[0].id;
    }
    draft.photos = { node, state, coverPath, layout };

    const coverBox = h("div", { class: "cover-slot" });
    const drawCover = () => coverBox.replaceChildren(
      state.cover ? h("img", { src: state.cover.url, alt: "" }) : h("span", { class: "ph" }, "Nessuna foto"),
      h("label", { class: "btn" }, state.cover ? "Sostituisci" : "Carica",
        h("input", { type: "file", accept: "image/*", hidden: true, onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          state.cover = await newPhoto(f, MAX_SIDE); drawCover(); markDirty();
        } })));
    drawCover();
    dropZone(coverBox, async (files) => { state.cover = await newPhoto(files[0], MAX_SIDE); drawCover(); markDirty(); });
    panel.append(h("h3", {}, ph.cover || "Foto"), coverBox);
    if (ph.layout) panel.append(h("div", { class: "head-switch cover-switch" },
      toggle(state.coverBig, (v) => { state.coverBig = v; markDirty(); }),
      h("span", {}, "Mostra la copertina grande in cima alla pagina"),
      h("small", { class: "hint" }, "(in home resta comunque la foto del progetto)")));
    if (ph.layout) panel.append(layoutPicker(state));

    if (ph.kind === "serie") {
      // With a page layout the sequence is a small preview of the page: the photos sit as they will on the site
      const grid = h("ol", { class: ph.layout ? `seq lay lay-${state.layout}` : "seq" });
      const draw = () => {
        const schema = ph.layout && schemaOf(state);
        grid.className = !ph.layout ? "seq" : schema ? "seq lay lay-custom" : `seq lay lay-${state.layout}`;
        const places = schema ? placeAll(schema, state.seq.length) : [];
        grid.replaceChildren(...state.seq.map((it, i) => {
          const li = h("li", { draggable: "true", style: places[i] ? `grid-column: ${places[i][0]} / span ${places[i][1]}; grid-row: ${places[i][2]}` : null },
            h("img", { src: it.url, alt: "" }),
            h("span", { class: "num" }, String(i + 1).padStart(2, "0")),
            h("span", { class: "tools" },
              h("button", { type: "button", title: "Prima", onclick: () => move(i, i - 1) }, "←"),
              h("button", { type: "button", title: "Dopo", onclick: () => move(i, i + 1) }, "→"),
              h("button", { type: "button", title: "Usa come copertina", onclick: () => { state.cover = { ...it }; drawCover(); markDirty(); } }, "★"),
              h("button", { type: "button", title: "Togli", onclick: () => { state.seq.splice(i, 1); draw(); markDirty(); } }, "×")),
          );
          li.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/x-seq", String(i)); li.classList.add("dragging"); });
          li.addEventListener("dragend", () => li.classList.remove("dragging"));
          li.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("text/x-seq")) e.preventDefault(); });
          li.addEventListener("drop", (e) => {
            const from = e.dataTransfer.getData("text/x-seq");
            if (from === "") return;
            e.preventDefault(); e.stopPropagation(); move(+from, i);
          });
          return li;
        }), h("li", { class: "add" }, h("label", {}, "+ Aggiungi foto",
          h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: (e) => addFiles(e.target.files) }))));
      };
      const move = (a, b) => {
        if (b < 0 || b >= state.seq.length) return;
        const [it] = state.seq.splice(a, 1); state.seq.splice(b, 0, it); draw(); markDirty();
      };
      const addFiles = async (files) => {
        for (const f of files) if (f.type.startsWith("image/")) state.seq.push(await newPhoto(f, MAX_SIDE));
        draw(); markDirty();
      };
      dropZone(grid, addFiles);
      state.onLayout = draw;
      draw();
      panel.append(h("h3", {}, ph.seq, h("small", {}, " trascina per riordinare, o trascina qui le foto dal Finder")), grid);
    }
    return panel;
  }

  // Standard layouts of a photo page sequence: the same ids are classes on the site (.photo-seq.layout-<id>).
  // Each mini drawing is a list of [x, y, w, h] boxes on a 40 x 52 page.
  const LAYOUTS = [
    { id: "colonna", name: "Colonna", note: "una foto per riga, al centro", boxes: [[13, 4, 14, 10], [13, 16, 14, 10], [13, 28, 14, 10], [13, 40, 14, 10]] },
    { id: "alternato", name: "Alternato", note: "una a sinistra, una a destra", boxes: [[3, 4, 20, 13], [17, 19, 20, 13], [3, 34, 20, 13]] },
    { id: "griglia", name: "Griglia", note: "due foto per riga", boxes: [[3, 4, 16.5, 11], [20.5, 4, 16.5, 11], [3, 17, 16.5, 11], [20.5, 17, 16.5, 11], [3, 30, 16.5, 11], [20.5, 30, 16.5, 11]] },
    { id: "grande", name: "Grande", note: "ogni foto a tutta larghezza", boxes: [[3, 4, 34, 21], [3, 27, 34, 21]] },
    { id: "ritmo", name: "Ritmo", note: "una grande, poi due affiancate", boxes: [[3, 4, 34, 20], [3, 26, 16.5, 11], [20.5, 26, 16.5, 11], [3, 39, 34, 9]] },
  ];

  // ---- layouts Simone generates at random and keeps: content/layout/_layouts.json
  // A schema is a list of rows; each row a list of [start column, width] on a 12-column grid.
  // The rows repeat down the page (tools/build_pages.py places the photos the same way).
  const MINE_FILE = "content/layout/_layouts.json";
  let MINE = [];
  async function loadMine() {
    try { MINE = JSON.parse(await readText(MINE_FILE, true) || "[]"); } catch (e) { MINE = []; }
    if (!Array.isArray(MINE)) MINE = [];
  }
  const schemaOf = (state) => state.layout === "casuale" ? state.schema : (MINE.find((l) => l.id === state.layout) || {}).schema || null;
  function placeAll(schema, n) {
    const out = [];
    for (let r = 0; out.length < n; r++) for (const [s, w] of schema[r % schema.length]) if (out.length < n) out.push([s, w, r + 1]);
    return out;
  }
  function randomSchema() {
    const any = (a) => a[Math.floor(Math.random() * a.length)];
    const rows = [];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let r = 0; r < count; r++) {
      const k = Math.random();
      if (k < 0.45) { const w = any([4, 5, 6, 7, 8, 9, 12]); rows.push([[1 + Math.floor(Math.random() * (13 - w)), w]]); }
      else if (k < 0.85) {
        const a = any([3, 4, 5, 6, 7]); const b = Math.min(any([3, 4, 5, 6]), 12 - a);
        const gap = Math.floor(Math.random() * (13 - a - b)); const s = 1 + Math.floor(Math.random() * (13 - a - b - gap));
        rows.push(Math.random() < 0.5 ? [[s, a], [s + a + gap, b]] : [[s, b], [s + b + gap, a]]);
      } else rows.push([[1, 4], [5, 4], [9, 4]]);
    }
    return rows;
  }
  // mini drawing of a schema on the same 40 x 52 page as the built-in thumbnails
  function schemaBoxes(schema) {
    const boxes = []; let y = 0;
    for (let i = 0; i < 8 && y < 60; i++) {
      const row = schema[i % schema.length]; let hh = 0;
      for (const [s, w] of row) { const bw = w * 34 / 12 - 0.6; boxes.push([3 + (s - 1) * 34 / 12, y, bw, bw * 2 / 3]); hh = Math.max(hh, bw * 2 / 3); }
      y += hh + 1.6;
    }
    const k = Math.min(1, 44 / y);
    return boxes.filter((b) => b[1] * k < 46).map(([x, by, w, hh]) => [20 + (x - 20) * k, 4 + by * k, w * k, hh * k]);
  }
  const layoutJson = (v) => JSON.stringify(v, null, 2).replace(/\[\s*(\d+),\s*(\d+)\s*\]/g, "[$1, $2]") + "\n";

  function layoutPicker(state) {
    const NS = "http://www.w3.org/2000/svg";
    const mini = (l) => {
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 40 52"); svg.setAttribute("aria-hidden", "true");
      (l.boxes || schemaBoxes(l.schema)).forEach(([x, y, w, hh]) => {
        const r = document.createElementNS(NS, "rect");
        Object.entries({ x, y, width: w, height: hh, rx: 0.8 }).forEach(([k, v]) => r.setAttribute(k, v));
        svg.append(r);
      });
      return svg;
    };
    const wrap = h("div", { class: "layouts", role: "radiogroup", "aria-label": "Layout delle foto" });
    const pickLayout = (id) => { if (id === "casuale" && !state.schema) state.schema = randomSchema(); state.layout = id; if (state.onLayout) state.onLayout(); markDirty(); render(); };
    const option = (l, extra) => {
      const input = h("input", { type: "radio", name: "layout", value: l.id });
      input.checked = state.layout === l.id;
      input.addEventListener("change", () => pickLayout(l.id));
      return h("label", { class: "layout-opt" + (extra ? " " + extra : "") }, input, mini(l), h("b", {}, l.name), h("small", {}, l.note || ""));
    };
    const render = () => {
      wrap.replaceChildren(
        ...LAYOUTS.map((l) => option(l)),
        ...MINE.map((l) => {
          const opt = option({ ...l, note: "salvato da te" }, "mine");
          opt.append(h("button", { type: "button", class: "del", title: "Togli dai miei layout", onclick: (e) => {
            e.preventDefault();
            if (!confirm(`Togliere "${l.name}" dai tuoi layout? Le pagine che lo usano torneranno a Colonna.`)) return;
            MINE = MINE.filter((x) => x.id !== l.id); state.mineDirty = true;
            if (state.layout === l.id) state.layout = LAYOUTS[0].id;
            if (state.onLayout) state.onLayout(); markDirty(); render();
          } }, "×"));
          return opt;
        }),
        // random: every click draws a new layout; the photos below follow it at once
        (() => {
          const opt = option({ id: "casuale", name: "Casuale", note: state.layout === "casuale" ? "clicca per un altro" : "genera un layout a caso", schema: state.schema || [[[3, 8]], [[1, 5], [7, 6]]] }, "random");
          opt.addEventListener("click", (e) => {
            e.preventDefault();
            state.schema = randomSchema(); pickLayout("casuale");
          });
          return opt;
        })());
      tools.replaceChildren(...(state.layout === "casuale" ? [
        h("button", { type: "button", class: "btn", onclick: () => { state.schema = randomSchema(); pickLayout("casuale"); } }, "↻ Un altro"),
        h("button", { type: "button", class: "btn", onclick: () => {
          const name = (prompt("Nome del layout", `Mio ${MINE.length + 1}`) || "").trim();
          if (!name) return;
          const id = "mio-" + Date.now().toString(36);
          MINE.push({ id, name, schema: state.schema }); state.mineDirty = true;
          pickLayout(id);
        } }, "♥ Salva tra i miei layout"),
      ] : []));
    };
    const tools = h("div", { class: "layout-tools" });
    render();
    return h("div", {}, h("h3", {}, "Layout delle foto", h("small", {}, " vale per tutta la sequenza; sul telefono sempre una foto per riga")), wrap, tools);
  }

  async function newPhoto(file, side) {
    const blob = await toJpeg(file, side);
    return { blob, url: URL.createObjectURL(blob), name: file.name };
  }

  function dropZone(el, onFiles) {
    el.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); el.classList.add("over"); } });
    el.addEventListener("dragleave", () => el.classList.remove("over"));
    el.addEventListener("drop", (e) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault(); el.classList.remove("over"); onFiles([...e.dataTransfer.files]);
    });
  }

  async function folderField(node) {
    const path = `content/foto/${node.cartella}.json`;
    let data = {};
    try { data = JSON.parse(await readText(path) || "{}"); } catch (e) { data = {}; }
    draft.cartella = { path, data, value: data.cartella || "" };
    const input = h("input", { type: "text", placeholder: "es. 01home/03ricerca_visiva/01faccini", value: data.cartella || "" });
    input.addEventListener("input", () => { draft.cartella.value = input.value.trim(); markDirty(); });
    return h("label", { class: "field folder" },
      h("span", {}, "Cartella sul Mac (dentro porfolio/information_architecture)"), input,
      h("small", {}, "Se cambi una foto in questa cartella, il Mac la manda al sito entro 3 minuti. Vince l'ultima modifica, qui o nella cartella."));
  }

  // ---------------------------------------------------------------- archive

  async function archivePanel() {
    let list = [];
    try { list = JSON.parse(await readText("img/archivio/archivio.json") || "[]"); } catch (e) { list = []; }
    const state = { list: list.map((p) => ({ ...p })), added: [], removed: [] };
    draft.archive = state;
    const grid = h("div", { class: "archive-grid" });
    const draw = () => grid.replaceChildren(
      ...state.list.map((p, i) => h("div", { class: "arc" },
        h("img", { src: p._url || siteUrl(`img/archivio/thumbs/${p.file}`), alt: "", loading: "lazy" }),
        h("span", { class: "num" }, p.n),
        ...["film", "luogo", "anno"].map((k) => {
          const inp = h("input", { type: "text", placeholder: k, value: p[k] == null ? "" : p[k] });
          inp.addEventListener("input", () => { p[k] = k === "anno" ? (inp.value ? Number(inp.value) || inp.value : null) : inp.value; markDirty(); });
          return inp;
        }),
        h("button", { type: "button", class: "x", title: "Togli dall'archivio", onclick: () => {
          if (!p._new) state.removed.push(p.file); else state.added = state.added.filter((a) => a.entry !== p);
          state.list.splice(i, 1); draw(); markDirty();
        } }, "×"))),
      h("label", { class: "arc add" }, "+ Aggiungi foto",
        h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: (e) => add(e.target.files) })));
    const add = async (files) => {
      let n = Math.max(0, ...state.list.map((p) => parseInt(p.n, 10) || 0), ...Object.keys(tree)
        .filter((p) => /^img\/archivio\/\d+\.jpg$/.test(p)).map((p) => parseInt(p.match(/(\d+)\.jpg$/)[1], 10)));
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        n += 1;
        const num = String(n).padStart(4, "0");
        const big = await toJpeg(f, ARCHIVE_SIDE), thumb = await toJpeg(f, THUMB_SIDE);
        const entry = { n: num, file: num + ".jpg", film: "", luogo: "", anno: null, _new: true, _url: URL.createObjectURL(thumb) };
        state.list.push(entry);
        state.added.push({ entry, big, thumb });
      }
      draw(); markDirty();
    };
    dropZone(grid, add);
    draw();
    return h("div", {}, h("h3", {}, "Foto dell'archivio", h("small", {}, ` ${state.list.length} foto · escono a caso nella pagina Archivio`)), grid);
  }

  // ---------------------------------------------------------------- save

  async function save() {
    const btn = $("#save"), st = $("#save-state");
    btn.disabled = true;
    st.textContent = "Salvo…";
    const node = current;
    try {
      const sha = await commit(`Update ${node.title} from admin`, async () => {
        const out = {};
        // texts: apply each edited field to the latest version of its file
        const byFile = {};
        Object.values(draft.texts).forEach(({ f, value }) => { (byFile[f.file] = byFile[f.file] || []).push([f, value]); });
        for (const [file, edits] of Object.entries(byFile)) {
          let text = await readText(file, true);
          const before = text;
          edits.forEach(([f, v]) => { text = setField(text, f, v); });
          if (text !== before) out[file] = await blobFrom({ text });
        }
        // site settings
        if (draft.sito && Object.keys(draft.sito).length) {
          const fresh = JSON.parse(await readText(SITO_FILE, true) || "{}");
          for (const [path, v] of Object.entries(draft.sito)) setPath(fresh, path, v);
          const json = JSON.stringify(fresh, null, 2) + "\n";
          if (json !== (texts[SITO_FILE] || "")) out[SITO_FILE] = await blobFrom({ text: json });
        }
        // home grid
        if (draft.home || draft.orderDirty || Object.keys(draft.switches).length) {
          const fresh = JSON.parse(await readText("content/home.json", true) || "{}");
          const next = { ...fresh, sezioni: { ...(fresh.sezioni || {}) } };
          if (draft.home) next.ricerca_visiva = draft.home.list;
          if (draft.orderDirty) next.ordine = [...draft.order];
          next.ricerca_visiva = (next.ricerca_visiva || []).map((r) => ({ ...r }));
          for (const [key, v] of Object.entries(draft.switches)) {
            if (key.startsWith("rv:")) { const r = next.ricerca_visiva.find((x) => x.id === key.slice(3)); if (r) r.visibile = v; }
            else next.sezioni[key] = v;
          }
          const json = JSON.stringify(next, null, 2) + "\n";
          if (json !== texts["content/home.json"]) out["content/home.json"] = await blobFrom({ text: json });
        }
        // Mac folder
        if (draft.cartella && draft.cartella.value !== (draft.cartella.data.cartella || "")) {
          const data = { ...draft.cartella.data, cartella: draft.cartella.value };
          out[draft.cartella.path] = await blobFrom({ text: JSON.stringify(data, null, 2) + "\n" });
        }
        // photos of a page: cover + 01, 02 ... rebuilt from existing blobs and new uploads
        if (draft.photos) {
          const { node: n, state, coverPath } = draft.photos;
          const shaOf = async (it) => it.sha || (it.sha = await blobFrom({ blob: it.blob }));
          if (state.cover && state.cover.sha !== tree[coverPath]) out[coverPath] = await shaOf(state.cover);
          if (n.photos.kind === "serie") {
            const dir = n.photos.dir;
            for (let i = 0; i < state.seq.length; i++) {
              const p = `${dir}/${String(i + 1).padStart(2, "0")}.jpg`;
              const s = await shaOf(state.seq[i]);
              if (tree[p] !== s) out[p] = s;
            }
            Object.keys(tree).forEach((p) => {
              const m = p.startsWith(dir + "/") && p.slice(dir.length + 1).match(/^(\d{2,})\.jpg$/);
              if (m && parseInt(m[1], 10) > state.seq.length) out[p] = null;
            });
          }
          if (draft.photos.layout) {
            const fresh = JSON.parse(await readText(n.photos.layout, true) || "{}");
            const { foto, ...rest } = fresh; // "foto" = per-photo sizes of the first version, no longer used
            delete rest.schema;
            const page = { ...rest, copertina: state.coverBig, layout: state.layout };
            if (state.layout === "casuale") page.schema = state.schema;
            const json = layoutJson(page);
            if (json !== (texts[n.photos.layout] || "")) out[n.photos.layout] = await blobFrom({ text: json });
            if (state.mineDirty) {
              const mine = layoutJson(MINE);
              if (mine !== (texts[MINE_FILE] || "")) out[MINE_FILE] = await blobFrom({ text: mine });
            }
          }
        }
        // archive: new files, removed files, archivio.json
        if (draft.archive) {
          const a = draft.archive;
          for (const { entry, big, thumb } of a.added) {
            out[`img/archivio/${entry.file}`] = await blobFrom({ blob: big });
            out[`img/archivio/thumbs/${entry.file}`] = await blobFrom({ blob: thumb });
          }
          a.removed.forEach((file) => { out[`img/archivio/${file}`] = null; if (tree[`img/archivio/thumbs/${file}`]) out[`img/archivio/thumbs/${file}`] = null; });
          const clean = a.list.map(({ _new, _url, ...p }) => p);
          const json = JSON.stringify(clean, null, 2) + "\n";
          if (json !== (texts["img/archivio/archivio.json"] || "")) out["img/archivio/archivio.json"] = await blobFrom({ text: json });
        }
        return out;
      });
      draft.dirty = false;
      if (draft.home || Object.keys(draft.switches).length) { await applyHome(); renderNav(); }
      if (!sha) { st.textContent = "Niente da salvare"; return; }
      st.textContent = "Salvato. Il sito si aggiorna in 1-2 minuti…";
      waitPublished(sha, node);
    } catch (e) {
      btn.disabled = false;
      st.textContent = "";
      alert("Salvataggio non riuscito: " + e.message);
    }
  }

  // Follow the publication: the Action commits the rebuilt pages after ours, then Pages deploys.
  async function waitPublished(sha, node) {
    const st = () => $("#save-state");
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      await new Promise((r) => setTimeout(r, 10000));
      try {
        const commits = await gh("GET", `/repos/${REPO}/commits?sha=${BRANCH}&per_page=3`);
        const i = commits.findIndex((c) => c.sha === sha);
        if (i > 0 || Date.now() - t0 > 60000) break;
      } catch (e) { break; }
    }
    await new Promise((r) => setTimeout(r, 45000));
    if (current === node && st()) st().textContent = "Online ✓ (se non vedi la modifica, ricarica la pagina)";
    setPreview(node.page, true);
    if (current === node) open(node);
  }

  // ---------------------------------------------------------------- preview

  function setPreview(page, reload) {
    const frame = $("#preview iframe");
    if (!page) return;
    const url = SITE + page.replace(/#.*/, "") + (reload ? "?t=" + Date.now() : "") + (page.includes("#") ? page.slice(page.indexOf("#")) : "");
    if (reload || frame.dataset.page !== page) { frame.src = url; frame.dataset.page = page; }
    $("#preview a").href = SITE + page;
  }

  // ---------------------------------------------------------------- login

  async function start() {
    token = localStorage.getItem(KEY);
    if (!token) return showLogin();
    try {
      await loadTree();
    } catch (e) {
      return showLogin(e.status === 401 ? "Il token non funziona più: creane uno nuovo." : "Non riesco a collegarmi a GitHub: " + e.message);
    }
    await applyHome();
    document.body.classList.add("ready");
    renderNav();
    const start = ALL.find((n) => n.id === location.hash.slice(1)) || ALL[0];
    open(start);
  }

  function showLogin(msg) {
    document.body.classList.remove("ready");
    const input = $("#token");
    $("#login-msg").textContent = msg || "";
    $("#login").onsubmit = async (e) => {
      e.preventDefault();
      token = input.value.trim();
      try {
        await gh("GET", `/repos/${REPO}`);
        localStorage.setItem(KEY, token);
        input.value = "";
        start();
      } catch (err) {
        $("#login-msg").textContent = "Token non valido per " + REPO + " (" + err.status + ").";
      }
    };
  }

  $("#logout").addEventListener("click", () => { localStorage.removeItem(KEY); location.reload(); });
  $("#toggle-preview").addEventListener("click", () => document.body.classList.toggle("no-preview"));
  window.addEventListener("beforeunload", (e) => { if (draft && draft.dirty) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("hashchange", () => {
    const n = ALL.find((x) => x.id === location.hash.slice(1));
    if (n && n !== current) open(n);
  });
  start();
})();
