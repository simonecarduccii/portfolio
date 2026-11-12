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
    if (tag === "img") el.addEventListener("error", (e) => imgFallback(e));
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  };

  let token = null;
  let tree = {};         // path -> blob sha, for the whole repo at the last load
  const texts = {};      // path -> file content at the last load
  let current = null;    // element being edited
  let draft = null;      // its pending changes

  // ------------------------------------------------------------------ GitHub

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // One GitHub API call. Network errors, 5xx and rate limits (403/429) are retried a few times with a pause.
  async function gh(method, path, body) {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(API + path, {
          method,
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
          body: body ? JSON.stringify(body) : undefined,
          cache: "no-store",
        });
      } catch (e) {
        if (attempt < 3) { await sleep(2000 * (attempt + 1)); continue; }
        const err = new Error("connessione a GitHub non riuscita (" + e.message + ")");
        err.status = 0;
        throw err;
      }
      if (res.ok) return res.status === 204 ? null : res.json();
      const text = (await res.text()).slice(0, 200);
      const limited = res.status === 429 || (res.status === 403 && /rate limit/i.test(text));
      if ((res.status >= 500 || limited) && attempt < 3) {
        const wait = Number(res.headers.get("retry-after")) * 1000 || 3000 * (attempt + 1);
        await sleep(Math.min(wait, 20000));
        continue;
      }
      const err = new Error(`GitHub ${res.status}: ${text}`);
      err.status = res.status;
      throw err;
    }
  }

  // Plain-language reason for a failed save
  function why(e) {
    if (e.status === 401) return "il token non funziona più (scaduto o revocato): esci e rientra con un token nuovo.";
    if (e.status === 403 || e.status === 404) return "il token non ha il permesso di scrivere sul repository (serve Contents: Read and write).";
    if (e.status === 422) return "il sito è stato aggiornato più volte mentre salvavi. Le tue modifiche sono ancora qui: riprova tra qualche secondo.";
    if (e.status === 0) return "connessione assente o instabile. Le tue modifiche sono ancora qui: riprova appena torna la rete.";
    return e.message;
  }

  async function loadTree() {
    const ref = await gh("GET", `/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const commit = await gh("GET", `/repos/${REPO}/git/commits/${ref.object.sha}`);
    const t = await gh("GET", `/repos/${REPO}/git/trees/${commit.tree.sha}?recursive=1`);
    const before = Object.keys(tree).length ? tree : null;
    tree = {};
    t.tree.forEach((e) => { if (e.type === "blob") tree[e.path] = e.sha; });
    noteChanges(before, ref.object.sha);
    return ref.object.sha;
  }

  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  // cached by blob: after a save (or a change made elsewhere) the file has a new sha and is read again,
  // otherwise a page reopened after saving would show the text from before the save
  const textSha = {};
  async function readText(path, fresh) {
    if (!fresh && texts[path] != null && textSha[path] === tree[path]) return texts[path];
    if (!tree[path]) return "";
    const sha = tree[path];
    const blob = await gh("GET", `/repos/${REPO}/git/blobs/${sha}`);
    texts[path] = b64ToText(blob.content);
    textSha[path] = sha;
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
    // the Action commits the rebuilt pages a few seconds after each save: if it lands between our read and our
    // write, GitHub answers 422 and we start again on the new head (photo blobs are kept, not uploaded twice)
    for (let attempt = 0; attempt < 6; attempt++) {
      if (attempt) await sleep(1500 * attempt);
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
        if (e.status !== 422 || attempt === 5) throw e;
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
      if (n < 0) return f.optional ? "" : null; // optional line: added on save after the line named in f.after
      return lines[n].replace(/^\s*- \*\*[^*]+:\*\*\s?/, "");
    }
    const r = sectionRange(lines, f.section);
    return r ? lines.slice(r[0] + 1, r[1]).join("\n").trim() : null;
  }

  function setField(text, f, value) {
    const lines = text.split("\n");
    if (f.meta) {
      let n = metaLine(lines, f.meta, f.in);
      if (n < 0 && f.optional && value.trim()) {
        const after = f.after ? metaLine(lines, f.after, f.in) : -1;
        n = after >= 0 ? after + 1 : lines.findIndex((l) => /^\s*- \*\*[^*]+:\*\*/.test(l)) + 1;
        lines.splice(n, 0, `- **${f.meta}:**`);
      }
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

  // A file replaced by a save (same name, new content) is on GitHub minutes before the site has it: until then the
  // site would still send the old photo, and the browser would keep it. For 15 minutes after the change the panel
  // shows it from GitHub at the exact commit instead. Remembered across reloads of the panel.
  const FRESH_KEY = "adm-fresh", FRESH_MS = 15 * 60000;
  let fresh = {};
  try { fresh = JSON.parse(localStorage.getItem(FRESH_KEY) || "{}") || {}; } catch (e) { fresh = {}; }
  function noteChanges(before, head) {
    const now = Date.now();
    Object.keys(fresh).forEach((p) => { if (now - fresh[p].t > FRESH_MS) delete fresh[p]; });
    if (before) Object.keys(tree).forEach((p) => {
      if (before[p] && before[p] !== tree[p] && /\.(jpe?g|png|webp|gif|svg)$/i.test(p)) fresh[p] = { sha: tree[p], c: head, t: now };
    });
    try { localStorage.setItem(FRESH_KEY, JSON.stringify(fresh)); } catch (e) { /* private mode */ }
  }
  const siteUrl = (path) => {
    const f = fresh[path];
    if (f && f.sha === tree[path] && Date.now() - f.t < FRESH_MS) return `https://raw.githubusercontent.com/${REPO}/${f.c}/${path}`;
    return SITE + path + (tree[path] ? "?v=" + tree[path].slice(0, 8) : "");
  };

  // A photo just saved is on GitHub before the site has it (publishing takes 1-2 minutes): when a site image
  // fails to load, show it straight from GitHub instead of a broken image.
  const SITE_BASE = new URL(SITE, location.href).pathname;
  // (attached by h() to every image: the error of an image not yet in the page does not reach the document)
  async function imgFallback(e) {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fromGithub || !img.src.startsWith("http")) return;
    const u = new URL(img.src, location.href);
    if (!u.pathname.startsWith(SITE_BASE)) return;
    const path = decodeURIComponent(u.pathname.slice(SITE_BASE.length));
    if (!tree[path]) return;
    img.dataset.fromGithub = "1";
    try {
      const blob = await gh("GET", `/repos/${REPO}/git/blobs/${tree[path]}`);
      img.src = "data:image/jpeg;base64," + blob.content.replace(/\n/g, "");
    } catch (err) { /* leave it */ }
  }

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

  // Sidebar: the site tree, each branch can be closed (remembered in this browser), plus a search box.
  const NAV_KEY = "admin-nav-open";
  let navOpen = {};
  try { navOpen = JSON.parse(localStorage.getItem(NAV_KEY) || "{}") || {}; } catch (e) { navOpen = {}; }
  let navQuery = "";
  const norm = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const contains = (n, c) => { for (let p = c; p; p = p.parent) if (p === n) return true; return false; };

  function renderNav() {
    let search = $("#nav-search");
    if (!search) {
      search = h("input", { id: "nav-search", type: "search", placeholder: "Cerca una pagina…", "aria-label": "Cerca una pagina" });
      search.addEventListener("input", () => { navQuery = norm(search.value.trim()); renderNav(); });
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { const first = $("#nav .node"); if (first) first.click(); }
        if (e.key === "Escape") { search.value = ""; navQuery = ""; renderNav(); }
      });
      $("#nav").before(search);
    }
    const match = (n) => !navQuery || norm(n.title).includes(navQuery) || (n.children || []).some(match);
    // open by default: the first level, and any branch holding the page being edited
    const isOpen = (n, depth) => navQuery ? true : n.id in navOpen ? navOpen[n.id] : depth === 0 || contains(n, current);
    const list = (nodes, depth) => h("ul", { class: "tree d" + depth }, nodes.filter(match).map((n) => {
      const kids = n.children && n.children.length;
      const openNow = kids && isOpen(n, depth);
      return h("li", { class: kids ? (openNow ? "branch open" : "branch") : null },
        kids ? h("button", { type: "button", class: "caret", "aria-expanded": openNow ? "true" : "false",
          "aria-label": (openNow ? "Chiudi " : "Apri ") + n.title,
          onclick: () => { navOpen[n.id] = !openNow; try { localStorage.setItem(NAV_KEY, JSON.stringify(navOpen)); } catch (e) { /* private mode */ } renderNav(); } },
          openNow ? "▾" : "▸") : h("span", { class: "caret-space" }),
        h("button", {
          type: "button", class: "node" + (n.hidden ? " hidden" : "") + (current === n ? " on" : "") + (n.group ? " group" : ""),
          title: n.hidden ? "Spento: non compare in home" : null,
          onclick: () => open(n),
        }, n.title, n.hidden ? h("span", { class: "tag" }, "spento") : pageSlug(n) && BUILDING.has(pageSlug(n)) ? h("span", { class: "tag" }, "in costruzione") : null),
        openNow ? list(n.children, depth + 1) : null);
    }));
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
      main.querySelectorAll("[data-live]").forEach((el) => livePreview(el.dataset.live, el.value));
      linkPreview();
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
      pageSlug(node) ? h("div", { class: "head-switch building-switch" }, toggle(BUILDING.has(pageSlug(node)), (v) => { draft.building = v; markDirty(); }),
        h("span", {}, "Pagina in costruzione"), h("small", { class: "hint" }, "(chi la apre vede solo l'avviso, con menu e footer)")) : null,
      node.note ? h("p", { class: "note" }, node.note) : null);

    const body = h("div", { class: "el-body" });
    if (node.photos) body.append(await photoPanel(node));
    if (node.facts) body.append(await factsPanel(node));
    if (node.texts) body.append(await textPanel(node));
    if (node.settings) body.append(await settingsPanel());
    if (node.headerFooter) body.append(await headerFooterPanel());
    if (node.posters) body.append(await postersPanel(node));
    if (node.videos) body.append(await videosPanel(node));
    if (node.instagram) body.append(await instagramPanel(node));
    if (node.library) body.append(await libraryPanel());
    if (node.pagesList) body.append(await pagesPanel());
    if (node.freePage) body.append(await builderPanel(node));
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
    if (seoKey(node)) body.append(await seoPanel(node));
    const hist = historyTargets(node);
    if (hist.whole.length || hist.prefixes.length || hist.fields.length) body.append(historyPanel(node, hist));
    const editable = node.posters || node.videos || node.instagram || node.headerFooter || node.library || node.photos || node.facts || node.texts || node.homeList || node.settings || node.freePage || pageSlug(node) || node.switchKey || (node.children || []).some((c) => c.switchKey);
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

  // ---------------------------------------------------------------- pages made of blocks ("Pagine")
  // content/pagine/<slug>.json = {titolo, descrizione, blocchi: [...]}; photos in img/<slug>/.
  // The block types are the components of the Figma page "Componenti" (docs/COMPONENTI.md);
  // tools/build_pages.py turns each block into the same HTML as the other pages.

  const PAGE_DIR = "content/pagine/";
  // ---------------------------------------------------------------- videos
  // A video is a YouTube / Vimeo link, or a file uploaded to media/<page>/ (max 50 MB: longer videos go on YouTube or Vimeo).
  // In the JSON it is always a string: the link, or the path of the file.

  const VIDEO_MAX = 50 * 1024 * 1024;
  const isVideoRef = (v) => (typeof v === "string" && /^(https?:\/\/|media\/)/.test(v.trim())) || (v && typeof v === "object" && v.video);
  const videoKind = (v) => {
    if (v && typeof v === "object") return "file";
    const s = (v || "").trim();
    if (/youtube\.com|youtu\.be/.test(s)) return "YouTube";
    if (/vimeo\.com/.test(s)) return "Vimeo";
    if (/^media\//.test(s)) return "file";
    return s ? "?" : "";
  };

  function videoField(get, set) {
    const wrap = h("div", { class: "video-field" });
    const draw = () => {
      const v = get();
      const isFile = videoKind(v) === "file";
      const url = h("input", { type: "text", placeholder: "Link YouTube o Vimeo (https://…)", "aria-label": "Link del video" });
      url.value = isFile ? "" : (v || "");
      const status = h("small", { class: "video-status" });
      const showStatus = () => {
        const k = videoKind(get());
        status.textContent = k === "?" ? "Link non riconosciuto: incolla l'indirizzo di un video YouTube o Vimeo." : k && k !== "file" ? `Video ${k} ✓` : "";
      };
      url.addEventListener("input", () => { set(url.value.trim()); showStatus(); });
      const file = h("input", { type: "file", accept: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v", hidden: "" });
      file.addEventListener("change", () => {
        const f = file.files[0];
        if (!f) return;
        if (f.size > VIDEO_MAX) { alert(`Il file pesa ${Math.round(f.size / 1048576)} MB: il massimo è 50 MB. Caricalo su YouTube o Vimeo e incolla qui il link.`); return; }
        const ext = ((f.name.match(/\.(mp4|webm|mov|m4v)$/i) || [])[1] || "mp4").toLowerCase();
        set({ video: true, blob: f, ext, name: f.name, url: URL.createObjectURL(f) });
        draw();
      });
      const cur = get();
      const src = cur && typeof cur === "object" ? cur.url : isFile ? siteUrl(cur) : null;
      wrap.replaceChildren(
        h("div", { class: "video-row" }, url, h("label", { class: "btn small" }, file, "Carica un file")),
        status,
        src ? h("div", { class: "video-file" }, h("video", { src, controls: "", preload: "metadata", playsinline: "" }),
          h("button", { type: "button", class: "btn small", onclick: () => { set(""); draw(); } }, "Togli il file")) : null);
      showStatus();
    };
    draw();
    return wrap;
  }

  // the string saved in the JSON; an uploaded file goes to media/<slug>/
  async function putVideo(v, slug, out) {
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (!v.path) v.path = `media/${slug}/${newId()}.${v.ext}`;
    if (!v.sha) v.sha = await blobFrom({ blob: v.blob });
    out[v.path] = v.sha;
    return v.path;
  }

  // files in media/<slug>/ that nothing uses any more are removed
  function dropUnusedMedia(slug, used, out) {
    Object.keys(tree).forEach((p) => { if (p.startsWith(`media/${slug}/`) && !used.has(p) && !(p in out)) out[p] = null; });
  }

  const BLOCKS = [
    { tipo: "titolo", name: "Titolo pagina", note: "titolo grande e anno", make: () => ({ titolo: "", anno: "" }) },
    { tipo: "foto", name: "Foto grande", note: "una foto, larga o a tutta pagina", make: () => ({ foto: null, piena: false }) },
    { tipo: "testo", name: "Testo", note: "paragrafi e una nota in piccolo", make: () => ({ testo: "", nota: "" }) },
    { tipo: "citazione", name: "Citazione", note: "una frase grande in corsivo", make: () => ({ testo: "", autore: "" }) },
    { tipo: "scheda", name: "Scheda dati", note: "righe etichetta / valore", make: () => ({ righe: [["", ""]] }) },
    { tipo: "sequenza", name: "Sequenza foto", note: "più foto (e video) in uno dei layout", make: () => ({ layout: "griglia", foto: [] }) },
    { tipo: "video", name: "Video", note: "YouTube, Vimeo o un file", make: () => ({ video: "", didascalia: "", larga: false }) },
    { tipo: "altri", name: "Altri progetti", note: "automatico: fino a 3 progetti di Ricerca visiva", make: () => ({}) },
    { tipo: "successivo", name: "Progetto successivo", note: "un link a un'altra pagina", make: () => ({ pagina: "", testo: "" }) },
    { tipo: "fascia", name: "Fascia", note: "Pellicole (colori) o Archivio (bianco e nero)", make: () => ({ variante: "archivio" }) },
  ];
  const newId = () => Math.random().toString(36).slice(2, 8);
  const pageSlugs = () => Object.keys(tree).map((p) => (p.match(/^content\/pagine\/([a-z0-9][a-z0-9-]*)\.json$/) || [])[1]).filter(Boolean).sort();

  async function applyPages() {
    const group = ALL.find((n) => n.pagesList);
    if (!group) return;
    const kids = [];
    for (const slug of pageSlugs()) {
      let title = slug;
      try { title = JSON.parse(await readText(PAGE_DIR + slug + ".json")).titolo || slug; } catch (e) { /* keep the slug */ }
      kids.push({ id: "pg-" + slug, title, page: slug + ".html", freePage: slug,
        note: `Online all'indirizzo …/simonecarducci/${slug}.html. Componi la pagina con i blocchi dei componenti Figma: aggiungili, riordinali con ↑ ↓, toglili con ×.` });
    }
    group.children = kids;
    ALL = flatten(window.STRUTTURA, null);
  }

  async function pagesPanel() {
    await applyPages();
    const group = ALL.find((n) => n.pagesList);
    const ul = h("ol", { class: "order-list" }, group.children.map((n) => h("li", {},
      h("span", {}, n.title, h("small", {}, ` ${n.freePage}.html`)),
      h("span", { class: "tools" },
        h("button", { type: "button", onclick: () => open(n) }, "Apri"),
        h("button", { type: "button", class: "danger", onclick: () => deletePage(n.freePage, n.title) }, "Elimina")))));
    return h("section", { class: "panel" }, h("h2", {}, "Le tue pagine"),
      group.children.length ? ul : h("p", { class: "hint" }, "Ancora nessuna pagina."),
      h("button", { type: "button", class: "btn add-project", onclick: createPage }, "+ Nuova pagina"));
  }

  async function createPage() {
    if (unsaved()) return;
    const title = (prompt("Titolo della nuova pagina") || "").trim();
    if (!title) return;
    let slug = null;
    try {
      const sha = await commit(`Create page ${title} from admin`, async () => {
        const base = slugify(title);
        const taken = (s) => RESERVED.includes(s) || tree[`${s}.html`] || tree[`${PAGE_DIR}${s}.json`] || tree[`docs/progetti/${s}.md`];
        slug = base;
        for (let k = 2; taken(slug); k++) slug = `${base}-${k}`;
        const data = { titolo: title, descrizione: "", blocchi: [
          { id: newId(), tipo: "titolo", titolo: title, anno: String(new Date().getFullYear()) },
          { id: newId(), tipo: "testo", testo: "Testo da scrivere.", nota: "" },
          { id: newId(), tipo: "fascia", variante: "archivio" }] };
        return { [`${PAGE_DIR}${slug}.json`]: await blobFrom({ text: asJson(data) }) };
      });
      draft.dirty = false;
      await applyPages(); renderNav();
      const node = ALL.find((n) => n.freePage === slug);
      if (node) await open(node);
      if (sha && node) waitPublished(sha, node);
    } catch (e) { alert("Non sono riuscito a creare la pagina: " + e.message); }
  }

  async function deletePage(slug, title) {
    if (unsaved()) return;
    if (!confirm(`Eliminare la pagina “${title}” con le sue foto? (Resta recuperabile nella cronologia di GitHub.)`)) return;
    try {
      await commit(`Delete page ${title} from admin`, async () => {
        const out = {};
        Object.keys(tree).forEach((p) => {
          if (p === `${PAGE_DIR}${slug}.json` || p === `${slug}.html` || p.startsWith(`img/${slug}/`)) out[p] = null;
        });
        return out;
      });
      draft.dirty = false;
      await applyPages(); renderNav();
      await open(ALL.find((n) => n.pagesList));
    } catch (e) { alert("Non sono riuscito a eliminare la pagina: " + e.message); }
  }

  // Pages a "Progetto successivo" block can link to
  function linkTargets(self) {
    const out = [["index", "Home"]], seen = new Set(["index", self]);
    ALL.forEach((n) => {
      const p = n.page && !n.page.includes("#") && !n.noPage && n.page.replace(/\.html$/, "");
      if (p && !seen.has(p)) { seen.add(p); out.push([p, n.title]); }
    });
    return out;
  }

  async function builderPanel(node) {
    const slug = node.freePage, file = `${PAGE_DIR}${slug}.json`;
    let data = {};
    try { data = JSON.parse(await readText(file, true) || "{}"); } catch (e) { data = {}; }
    await loadMine();
    const state = { titolo: data.titolo || slug, descrizione: data.descrizione || "",
      blocchi: (Array.isArray(data.blocchi) ? data.blocchi : []).filter((b) => b && BLOCKS.some((t) => t.tipo === b.tipo))
        .map((b) => ({ ...JSON.parse(JSON.stringify(b)), id: b.id || newId() })) };
    draft.builder = { node, state, file, extra: Object.fromEntries(Object.entries(data).filter(([k]) => !["titolo", "descrizione", "blocchi"].includes(k))) };
    const changed = () => markDirty();

    const field = (label, value, set, opts = {}) => {
      const input = opts.rows ? h("textarea", { rows: opts.rows }) : h("input", { type: "text", placeholder: opts.placeholder || "" });
      input.value = value || "";
      input.addEventListener("input", () => { set(input.value); changed(); });
      return h("label", { class: "field" }, h("span", {}, label), input);
    };
    const select = (label, value, options, set) => {
      const sel = h("select", {}, options.map(([v, t]) => h("option", { value: v }, t)));
      sel.value = value;
      sel.addEventListener("change", () => { set(sel.value); changed(); });
      return h("label", { class: "field inline" }, h("span", {}, label), sel);
    };
    const photoSrc = (f) => (f && typeof f === "object" ? f.url : f && tree[f] ? siteUrl(f) : null);
    const picker = (multiple, onFiles) => {
      const input = h("input", { type: "file", accept: "image/*", multiple: multiple ? "" : null, hidden: "" });
      input.addEventListener("change", async () => { await onFiles([...input.files].filter(isImage)); input.value = ""; });
      return h("label", { class: "btn small" }, input, multiple ? "+ Aggiungi foto" : "Scegli foto");
    };

    const body = (b) => {
      switch (b.tipo) {
        case "titolo": return [field("Titolo", b.titolo, (v) => { b.titolo = v; }), field("Anno", b.anno, (v) => { b.anno = v; })];
        case "foto": {
          const src = photoSrc(b.foto);
          const box = h("div", { class: "block-photo" }, src ? h("img", { src, alt: "" }) : h("span", { class: "ph" }, "nessuna foto"),
            h("div", { class: "photo-btns" }, picker(false, async ([f]) => { const p = f && await newPhoto(f, MAX_SIDE); if (p) { b.foto = p; changed(); draw(); } }),
              libButton(false, ([p]) => { b.foto = p; changed(); draw(); })));
          dropZone(box, async ([f]) => { const p = f && isImage(f) && await newPhoto(f, MAX_SIDE); if (p) { b.foto = p; changed(); draw(); } });
          return [box, h("div", { class: "head-switch" }, toggle(!!b.piena, (v) => { b.piena = v; changed(); }), h("span", {}, "A tutta pagina (in cima alla pagina, sotto il menu)")),
            field("Descrizione della foto (per chi non vede)", b.alt, (v) => { b.alt = v; })];
        }
        case "video": return [videoField(() => b.video, (v) => { b.video = v; changed(); }),
          field("Didascalia (facoltativa)", b.didascalia, (v) => { b.didascalia = v; }),
          h("div", { class: "head-switch" }, toggle(!!b.larga, (v) => { b.larga = v; changed(); }), h("span", {}, "A tutta larghezza"))];
        case "testo": return [field("Testo (un rigo vuoto separa i paragrafi)", b.testo, (v) => { b.testo = v; }, { rows: 7 }),
          field("Nota in piccolo (facoltativa)", b.nota, (v) => { b.nota = v; })];
        case "citazione": return [field("Citazione", b.testo, (v) => { b.testo = v; }, { rows: 3 }), field("Autore (facoltativo)", b.autore, (v) => { b.autore = v; })];
        case "scheda": {
          b.righe = Array.isArray(b.righe) ? b.righe : [];
          const rows = h("div", { class: "facts-edit" });
          const drawRows = () => rows.replaceChildren(...b.righe.map((r, i) => {
            const k = h("input", { type: "text", placeholder: "Etichetta", "aria-label": "Etichetta" }), v = h("input", { type: "text", placeholder: "Valore", "aria-label": "Valore" });
            const l = h("input", { type: "text", placeholder: "Link (facoltativo)", "aria-label": "Link (facoltativo)" });
            k.value = r[0] || ""; v.value = r[1] || ""; l.value = r[2] || "";
            k.addEventListener("input", () => { r[0] = k.value; changed(); });
            v.addEventListener("input", () => { r[1] = v.value; changed(); });
            l.addEventListener("input", () => { r[2] = l.value; changed(); });
            return h("div", { class: "fact-row" }, k, v, l, h("button", { type: "button", title: "Togli la riga", onclick: () => { b.righe.splice(i, 1); drawRows(); changed(); } }, "×"));
          }), h("button", { type: "button", class: "btn small", onclick: () => { b.righe.push(["", ""]); drawRows(); changed(); } }, "+ Riga"));
          drawRows();
          return [rows];
        }
        case "sequenza": {
          b.foto = Array.isArray(b.foto) ? b.foto : [];
          const opts = [...LAYOUTS.map((l) => [l.id, `${l.name} (${l.note})`]), ...MINE.map((l) => [l.id, `${l.name} (salvato)`])];
          if (!opts.some(([v]) => v === b.layout)) b.layout = "griglia";
          const grid = h("ol", { class: "seq" }, b.foto.map((f, i) => h("li", {},
            isVideoRef(f) ? h("span", { class: "ph video-ph", title: typeof f === "string" ? f : f.name }, "▶ " + (videoKind(f) === "file" ? "video" : videoKind(f)))
              : photoSrc(f) ? h("img", { src: photoSrc(f), alt: "" }) : h("span", { class: "ph" }),
            h("span", { class: "num" }, String(i + 1).padStart(2, "0")),
            h("div", { class: "tools" },
              h("button", { type: "button", title: "Prima", onclick: () => { if (i) { b.foto.splice(i - 1, 0, b.foto.splice(i, 1)[0]); changed(); draw(); } } }, "←"),
              h("button", { type: "button", title: "Dopo", onclick: () => { if (i < b.foto.length - 1) { b.foto.splice(i + 1, 0, b.foto.splice(i, 1)[0]); changed(); draw(); } } }, "→"),
              h("button", { type: "button", title: "Togli", onclick: () => { b.foto.splice(i, 1); changed(); draw(); } }, "×")))));
          const add = async (files) => { for (const f of files) { const p = isImage(f) && await newPhoto(f, MAX_SIDE); if (p) b.foto.push(p); } changed(); draw(); };
          dropZone(grid, add);
          return [select("Layout", b.layout, opts, (v) => { b.layout = v; }), grid,
            h("div", { class: "photo-btns" }, picker(true, add), libButton(true, (list) => { b.foto.push(...list); changed(); draw(); }),
              h("button", { type: "button", class: "btn small", onclick: () => {
                const u = prompt("Link del video (YouTube o Vimeo):");
                if (u && /youtu|vimeo/.test(u)) { b.foto.push(u.trim()); changed(); draw(); } else if (u) alert("Link non riconosciuto: serve un video YouTube o Vimeo.");
              } }, "+ Video (link)"),
              (() => {
                const inp = h("input", { type: "file", accept: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v", hidden: "" });
                inp.addEventListener("change", () => {
                  const f = inp.files[0]; if (!f) return;
                  if (f.size > VIDEO_MAX) { alert("Il file supera 50 MB: caricalo su YouTube o Vimeo e usa il link."); return; }
                  b.foto.push({ video: true, blob: f, name: f.name, ext: ((f.name.match(/\.(mp4|webm|mov|m4v)$/i) || [])[1] || "mp4").toLowerCase() });
                  changed(); draw();
                });
                return h("label", { class: "btn small" }, inp, "+ Video (file)");
              })()),
            h("small", { class: "hint" }, "Per una coppia di foto affiancate: layout Griglia con 2 foto.")];
        }
        case "altri": return [h("p", { class: "hint" }, "Si riempie da solo con i progetti di Ricerca visiva accesi in home (al massimo 3).")];
        case "successivo": return [select("Porta a", b.pagina || "", [["", "— scegli una pagina —"], ...linkTargets(slug)], (v) => { b.pagina = v; }),
          field("Scritta a sinistra", b.testo, (v) => { b.testo = v; }, { placeholder: "Progetto successivo" })];
        case "fascia": return [select("Quale", b.variante || "archivio", [["pellicole", "Pellicole (a colori)"], ["archivio", "Archivio (bianco e nero)"]], (v) => { b.variante = v; })];
        default: return [];
      }
    };

    const list = h("div", { class: "blocks" });
    const adder = (at) => {
      const sel = h("select", { "aria-label": "Aggiungi un blocco" }, h("option", { value: "" }, "+ Aggiungi un blocco qui…"),
        BLOCKS.map((t) => h("option", { value: t.tipo }, `${t.name} — ${t.note}`)));
      sel.addEventListener("change", () => {
        const t = BLOCKS.find((x) => x.tipo === sel.value);
        if (!t) return;
        state.blocchi.splice(at, 0, { id: newId(), tipo: t.tipo, ...t.make() });
        changed(); draw();
      });
      return h("div", { class: "block-add" }, sel);
    };
    const move = (a, b2) => { if (b2 < 0 || b2 >= state.blocchi.length) return; state.blocchi.splice(b2, 0, state.blocchi.splice(a, 1)[0]); changed(); draw(); };
    function draw() {
      const out = [];
      state.blocchi.forEach((b, i) => {
        const t = BLOCKS.find((x) => x.tipo === b.tipo);
        out.push(adder(i), h("section", { class: "block" },
          h("header", {}, h("b", {}, t.name), h("small", {}, t.note),
            h("span", { class: "tools" },
              h("button", { type: "button", title: "Su", "aria-label": "Sposta su", onclick: () => move(i, i - 1) }, "↑"),
              h("button", { type: "button", title: "Giù", "aria-label": "Sposta giù", onclick: () => move(i, i + 1) }, "↓"),
              h("button", { type: "button", class: "danger", title: "Togli il blocco", "aria-label": "Togli il blocco",
                onclick: () => { if (confirm(`Togliere il blocco “${t.name}”?`)) { state.blocchi.splice(i, 1); changed(); draw(); } } }, "×"))),
          h("div", { class: "block-body" }, ...body(b))));
      });
      out.push(adder(state.blocchi.length));
      list.replaceChildren(...out);
    }
    draw();
    return h("div", {},
      h("section", { class: "panel" }, h("h2", {}, "Pagina"),
        field("Titolo (nella scheda del browser e nell'albero)", state.titolo, (v) => { state.titolo = v; }),
        field("Descrizione per Google (max 155 caratteri)", state.descrizione, (v) => { state.descrizione = v; }, { rows: 2 })),
      h("section", { class: "panel" }, h("h2", {}, "Blocchi", h("small", {}, " dall'alto in basso, come nella pagina")), list));
  }

  // Save: upload the new photos, drop the ones no block uses any more, write the JSON
  async function builderChanges(out) {
    const { state, file, extra, node } = draft.builder;
    const slug = node.freePage;
    const copies = [];
    const put = async (f, b) => {
      if (isVideoRef(f)) return putVideo(f, slug, out);
      if (!f || typeof f !== "object") return f;
      if (!f.path) f.path = `img/${slug}/${b.id}-${newId()}.jpg`;
      if (f.from) copies.push({ from: f.from, to: f.path });
      if (!f.sha) f.sha = await blobFrom({ blob: f.blob });
      out[f.path] = f.sha;
      return f.path;
    };
    const blocchi = [];
    for (const b of state.blocchi) {
      const c = { ...b };
      if (b.tipo === "foto") c.foto = await put(b.foto, b);
      if (b.tipo === "video") c.video = await putVideo(b.video, slug, out);
      if (b.tipo === "sequenza") { c.foto = []; for (const f of b.foto) c.foto.push(await put(f, b)); }
      if (b.tipo === "scheda") c.righe = (b.righe || []).filter((r) => (r[0] || "").trim() || (r[1] || "").trim());
      blocchi.push(c);
    }
    if (copies.length) await fociFollow(out, copies, null);
    dropUnusedMedia(slug, new Set(blocchi.flatMap((b) => (b.tipo === "video" ? [b.video] : b.tipo === "sequenza" ? b.foto : [])).filter((v) => typeof v === "string")), out);
    const used = new Set(blocchi.flatMap((b) => (b.tipo === "foto" ? [b.foto] : b.tipo === "sequenza" ? b.foto : [])).filter(Boolean));
    Object.keys(tree).forEach((p) => { if (p.startsWith(`img/${slug}/`) && p.endsWith(".jpg") && !used.has(p) && !(p in out)) out[p] = null; });
    const json = asJson({ ...extra, titolo: state.titolo.trim() || slug, descrizione: state.descrizione.trim(), blocchi });
    if (json !== (texts[file] || "")) out[file] = await blobFrom({ text: json });
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

  // Pages switched to "in costruzione" (content/sito.json -> in_costruzione: list of page names)
  let BUILDING = new Set();
  async function loadBuilding() {
    try { const s = JSON.parse(await readText(SITO_FILE, true) || "{}"); BUILDING = new Set(Array.isArray(s.in_costruzione) ? s.in_costruzione : []); }
    catch (e) { BUILDING = new Set(); }
  }
  // the page an element has of its own (not the home, not a section of it)
  const pageSlug = (n) => (n && n.page && !n.noPage && !n.page.includes("#") && n.page !== "index.html" ? n.page.replace(/\.html$/, "") : null);
  const SITO_FORM = [
    { title: "Scheda del browser", hint: "Il titolo che compare nella scheda del browser sulla home (e su Google, se non lo cambi in “Google e condivisione” della Home). Le altre pagine mostrano “Nome pagina — Simone Carducci”. Vuoto = Simone Carducci — Creative Development.", fields: [
      ["scheda.titolo", "Titolo della home", "Simone Carducci — Creative Development"]] },
    { title: "Contatti e link", hint: "Valgono in tutto il sito: footer, About, link di Lomography. Lascia LinkedIn vuoto per non mostrarlo.", fields: [
      ["contatti.email", "Email"], ["contatti.instagram", "Instagram (indirizzo completo)"],
      ["contatti.lomography", "Lomography (indirizzo completo)"], ["contatti.linkedin", "LinkedIn (indirizzo completo)"]] },
    { title: "Progetti fotografici", hint: "La parola prima dell'anno nella riga sotto il titolo delle pagine (es. Marrakech · Ricerca visiva: 2026). Se svuoti il campo compare solo l'anno.", fields: [
      ["etichette.ricerca_visiva", "Etichetta prima dell'anno", "vuoto = solo l'anno", "Ricerca visiva"]] },
    { title: "Crediti dei progetti fotografici", hint: "Il testo in fondo a ogni progetto fotografico che non ha crediti suoi (campo Crediti vuoto). [ANNO] diventa l'anno del progetto. Nel campo Crediti di un progetto puoi scrivere un testo diverso, oppure “–” per non mostrarli.", fields: [
      ["crediti", "Testo standard", "", "FOTOGRAFIE E TESTO: SIMONE CARDUCCI · [ANNO] · © [ANNO] SIMONE CARDUCCI. TUTTI I DIRITTI RISERVATI."]] },
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

  // Tab icon: content/icona/icona.png (512 × 512, cropped to a square from the middle). Without it the site uses
  // the black SC monogram in assets/ (favicon.svg, favicon-32.png, apple-touch-icon.png).
  const ICON_FILE = "content/icona/icona.png";
  function squarePng(file, side) {
    return new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = c.height = side;
        const s = Math.min(img.naturalWidth || side, img.naturalHeight || side);
        const sx = ((img.naturalWidth || s) - s) / 2, sy = ((img.naturalHeight || s) - s) / 2;
        c.getContext("2d").drawImage(img, sx, sy, s, s, 0, 0, side, side);
        c.toBlob((b) => (b ? ok(b) : ko(new Error("png"))), "image/png");
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => ko(new Error("img"));
      img.src = URL.createObjectURL(file);
    });
  }
  function iconField() {
    draft.icona = null;
    const box = h("div", { class: "icon-field" });
    const render = () => {
      const custom = draft.icona ? (draft.icona.remove ? null : draft.icona.url) : tree[ICON_FILE] ? siteUrl(ICON_FILE) : null;
      const src = custom || siteUrl("assets/favicon.svg");
      const inp = h("input", { type: "file", accept: "image/png,image/jpeg,image/svg+xml,image/webp", hidden: "" });
      inp.addEventListener("change", async () => {
        const f = inp.files[0]; if (!f) return;
        try { const blob = await squarePng(f, 512); draft.icona = { blob, url: URL.createObjectURL(blob) }; render(); markDirty(); }
        catch (e) { alert(`Non riesco a leggere “${f.name}”: usa un PNG, un JPEG o un SVG.`); }
      });
      box.replaceChildren(
        h("div", { class: "icon-preview" }, h("img", { src, alt: "Icona attuale", width: "64", height: "64" }),
          h("img", { src, alt: "", width: "16", height: "16" })),
        h("div", {},
          h("span", { class: "muted" }, custom ? (draft.icona ? "Icona nuova (si pubblica al salvataggio)" : "Icona caricata da te") : "Logo SC nero (predefinito)"),
          h("div", { class: "photo-btns" },
            h("label", { class: "btn small" }, inp, "Carica un'icona"),
            custom ? h("button", { type: "button", class: "btn small", onclick: () => { draft.icona = tree[ICON_FILE] ? { remove: true } : null; render(); markDirty(); } }, "Torna al logo SC") : null)));
    };
    render();
    return h("div", { class: "field" }, h("span", {}, "Icona della scheda (quadrata, almeno 180 × 180, ritagliata al centro)"), box);
  }

  // ---------------------------------------------------------------- global style
  // content/sito.json "stile": {font, colori: {sfondo, testo, testo_secondario, linee, footer_sfondo}, testo: %, spazi: %}.
  // Empty = the Figma design. Limits agreed with 1 · Designer: fonts with real italics and 400-700,
  // text 85-125 %, spacing 75-150 %, colours that pass AA contrast (4.5:1).

  const FONT_CHOICES = ["Hanken Grotesk", "Inter", "Work Sans", "DM Sans", "Instrument Sans", "Public Sans"];
  const STYLE_COLORS = [
    ["sfondo", "Sfondo (paper)", "#fbfbfb"], ["testo", "Testo (ink)", "#151515"], ["testo_secondario", "Testo secondario (ink-2)", "#585858"],
    ["linee", "Linee (rule)", "#e4e4e4"], ["footer_sfondo", "Sfondo del footer", "#151515"],
  ];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

  function styleProblems(st) {
    const col = (k) => (st.colori && st.colori[k]) || STYLE_COLORS.find((c) => c[0] === k)[2];
    const out = [];
    const check = (fg, bg, what) => { const r = contrast(fg, bg); if (r < 4.5) out.push(`${what}: contrasto ${r.toFixed(1)}:1, serve almeno 4,5:1`); };
    check(col("testo"), col("sfondo"), "Testo su sfondo");
    check(col("testo_secondario"), col("sfondo"), "Testo secondario su sfondo");
    check("#eeedea", col("footer_sfondo"), "Testo del footer su sfondo del footer");
    check("#8e8c88", col("footer_sfondo"), "Testo secondario del footer su sfondo del footer");
    return out;
  }

  function stylePanel(data) {
    const st = JSON.parse(JSON.stringify(data.stile && typeof data.stile === "object" ? data.stile : {}));
    st.colori = st.colori && typeof st.colori === "object" ? st.colori : {};
    const warn = h("p", { class: "style-warn", role: "alert" });
    const sample = h("div", { class: "style-sample" }, h("strong", {}, "Titolo di prova"), h("p", {}, "Un paragrafo di testo come nelle pagine del sito."),
      h("small", {}, "Etichetta · didascalia"), h("div", { class: "style-foot" }, "Footer"));
    const render = () => {
      const probs = styleProblems(st);
      warn.textContent = probs.length ? "Non salvo questi colori: " + probs.join("; ") + "." : "";
      draft.stileBlocked = probs.length > 0;
      const col = (k) => st.colori[k] || STYLE_COLORS.find((c) => c[0] === k)[2];
      Object.assign(sample.style, { background: col("sfondo"), color: col("testo"), fontFamily: `"${st.font || "Hanken Grotesk"}", sans-serif`, fontSize: (st.testo || 100) / 100 * 16 + "px", padding: (st.spazi || 100) / 100 * 16 + "px", borderColor: col("linee") });
      sample.querySelector("small").style.color = col("testo_secondario");
      sample.querySelector(".style-foot").style.background = col("footer_sfondo");
    };
    const changed = () => { draft.stile = st; render(); markDirty(); };
    const fontSel = h("select", { id: "st-font" }, FONT_CHOICES.map((f) => h("option", { value: f }, f + (f === "Hanken Grotesk" ? " (Figma)" : ""))));
    fontSel.value = st.font || "Hanken Grotesk";
    fontSel.addEventListener("change", () => { st.font = fontSel.value === "Hanken Grotesk" ? "" : fontSel.value; loadFont(fontSel.value); changed(); });
    const loadFont = (f) => {
      if (document.querySelector(`link[data-font="${f}"]`)) return;
      document.head.append(h("link", { rel: "stylesheet", "data-font": f, href: `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, "+")}:ital,wght@0,400;0,600;1,400&display=swap` }));
    };
    if (st.font) loadFont(st.font);
    const colorRows = STYLE_COLORS.map(([k, label, def]) => {
      const pick = h("input", { type: "color", "aria-label": label });
      const hex = h("input", { type: "text", maxlength: "7", "aria-label": label + " (esadecimale)", placeholder: def });
      pick.value = st.colori[k] || def; hex.value = st.colori[k] || "";
      const set = (v) => { if (!v || v.toLowerCase() === def) delete st.colori[k]; else st.colori[k] = v.toLowerCase(); changed(); };
      pick.addEventListener("input", () => { hex.value = pick.value; set(pick.value); });
      hex.addEventListener("input", () => { const v = hex.value.trim(); if (!v) { pick.value = def; set(""); } else if (/^#[0-9a-f]{6}$/i.test(v)) { pick.value = v; set(v); } });
      return h("label", { class: "color-row" }, h("span", {}, label), pick, hex);
    });
    const range = (key, label, lo, hi) => {
      const out = h("output", {}, (st[key] || 100) + "%");
      const r = h("input", { type: "range", min: String(lo), max: String(hi), step: "5", value: String(st[key] || 100), "aria-label": label });
      r.addEventListener("input", () => { const v = parseInt(r.value, 10); st[key] = v === 100 ? "" : v; out.textContent = v + "%"; changed(); });
      return h("label", { class: "range-row" }, h("span", {}, label), r, out);
    };
    const reset = h("button", { type: "button", class: "btn small", onclick: () => {
      Object.keys(st).forEach((k) => delete st[k]); st.colori = {};
      draft.stile = {}; draft.stileBlocked = false;
      panel.replaceWith(stylePanel({ stile: {} })); markDirty();
    } }, "Torna allo stile di Figma");
    const panel = h("section", { class: "panel" }, h("h2", {}, "Stile del sito"),
      h("p", { class: "hint" }, "Font, colori e misure di tutto il sito. 100% e i colori vuoti = il design di Figma. I colori devono restare leggibili (contrasto AA): se non lo sono, non vengono salvati."),
      h("label", { class: "field", for: "st-font" }, h("span", {}, "Font"), fontSel),
      h("div", { class: "colors" }, colorRows),
      range("testo", "Dimensione del testo", 85, 125),
      range("spazi", "Spaziature", 75, 150),
      warn, sample, reset);
    render();
    return panel;
  }

  async function settingsPanel() {
    let data = {};
    try { data = JSON.parse(await readText(SITO_FILE, true) || "{}"); } catch (e) { data = {}; }
    draft.sito = {};
    const wrap = h("div", {});
    SITO_FORM.forEach((g) => {
      const panel = h("section", { class: "panel" }, h("h2", {}, g.title), g.hint ? h("p", { class: "hint" }, g.hint) : null);
      g.fields.forEach(([path, label, placeholder, dflt]) => {
        const id = "s" + path.replace(/\W/g, "-");
        const input = h("input", { id, type: path.endsWith("email") ? "email" : path.startsWith("contatti.") && !path.endsWith("email") ? "url" : "text" });
        if (placeholder) input.placeholder = placeholder;
        const cur = getPath(data, path);
        // a field with a default shows it until changed; emptied, it stays empty on the site
        input.value = dflt != null ? (typeof cur === "string" ? cur : dflt) : cur || "";
        input.addEventListener("input", () => { draft.sito[path] = input.value.trim(); markDirty(); });
        panel.append(h("label", { class: "field", for: id }, h("span", {}, label), input));
      });
      if (g.title === "Scheda del browser") panel.append(iconField());
      wrap.append(panel);
    });
    wrap.append(stylePanel(data));
    return wrap;
  }

  // ---------------------------------------------------------------- header and footer
  // content/sito.json "testata": {nome, sottotitolo, menu: [{testo, link}]} and "footer": {invito, invito_link,
  // indirizzo, indirizzo_link, colonne: [{titolo, voci: [{testo, link}]}], copyright, credito, piva}.
  // Until they are saved once, the panel starts from what the published home shows.

  function rowsEditor(rows, keys, onChange, addLabel) {
    const box = h("div", { class: "facts-edit sheet-edit" });
    const draw = () => box.replaceChildren(...rows.map((r, i) => {
      const inputs = keys.map(([key, ph]) => {
        const el = h("input", { type: "text", placeholder: ph, "aria-label": ph });
        el.value = r[key] || "";
        el.addEventListener("input", () => { r[key] = el.value; onChange(); });
        return el;
      });
      const move = (d) => { const j = i + d; if (j < 0 || j >= rows.length) return; [rows[i], rows[j]] = [rows[j], rows[i]]; draw(); onChange(); };
      return h("div", { class: "sheet-row" + (keys.length === 2 ? " two" : "") }, ...inputs,
        h("div", { class: "row-tools" },
          h("button", { type: "button", title: "Sposta su", disabled: i === 0 ? true : null, onclick: () => move(-1) }, "↑"),
          h("button", { type: "button", title: "Sposta giù", disabled: i === rows.length - 1 ? true : null, onclick: () => move(1) }, "↓"),
          h("button", { type: "button", title: "Togli", onclick: () => { rows.splice(i, 1); draw(); onChange(); } }, "×")));
    }), h("button", { type: "button", class: "btn small", onclick: () => { rows.push(Object.fromEntries(keys.map(([k]) => [k, ""]))); draw(); onChange(); const l = box.querySelectorAll(".sheet-row"); l[l.length - 1].querySelector("input").focus(); } }, addLabel || "+ Aggiungi voce"));
    draw();
    return box;
  }

  async function headerFooterPanel() {
    let data = {};
    try { data = JSON.parse(await readText(SITO_FILE, true) || "{}"); } catch (e) { data = {}; }
    const doc = new DOMParser().parseFromString(await readText("index.html") || "", "text/html");
    const txt = (el) => (el ? el.textContent.trim() : "");
    const href = (el) => (el && el.getAttribute("href")) || "";
    const t = data.testata && typeof data.testata === "object" ? data.testata : {};
    const f = data.footer && typeof data.footer === "object" ? data.footer : {};
    const str = (v, dflt) => (typeof v === "string" ? v : dflt);
    const links = (els) => [...els].map((a) => ({ testo: txt(a), link: href(a) }));
    const hf = {
      dirty: false,
      testata: {
        nome: str(t.nome, txt(doc.querySelector("header .brand"))),
        sottotitolo: str(t.sottotitolo, txt(doc.querySelector("header .tag"))),
        menu: Array.isArray(t.menu) ? t.menu.map((r) => ({ testo: r.testo || "", link: r.link || "" })) : links(doc.querySelectorAll("header .nav a")),
      },
      footer: {
        invito: str(f.invito, txt(doc.querySelector(".footer-cta"))), invito_link: str(f.invito_link, href(doc.querySelector(".footer-cta"))),
        indirizzo: str(f.indirizzo, txt(doc.querySelector(".footer-email"))), indirizzo_link: str(f.indirizzo_link, href(doc.querySelector(".footer-email"))),
        colonne: Array.isArray(f.colonne)
          ? f.colonne.map((c) => ({ titolo: c.titolo || "", voci: (c.voci || []).map((r) => ({ testo: r.testo || "", link: r.link || "" })) }))
          : [...doc.querySelectorAll(".footer-cols > div")].map((d) => ({ titolo: txt(d.querySelector("h2")), voci: links(d.querySelectorAll("li a, li span")) })),
      },
    };
    draft.hf = hf;
    draft.sito = draft.sito || {};
    const changed = () => { hf.dirty = true; markDirty(); };
    const field = (obj, key, label, ph) => {
      const id = "hf-" + key + Math.random().toString(36).slice(2, 6);
      const el = h("input", { id, type: "text", placeholder: ph || "" });
      el.value = obj[key] || "";
      el.addEventListener("input", () => { obj[key] = el.value; changed(); });
      return h("label", { class: "field", for: id }, h("span", {}, label), el);
    };
    const pair = (obj, k, kl, label, linkPh) => h("div", { class: "hf-pair" }, field(obj, k, label), field(obj, kl, "Link", linkPh));

    const header = h("section", { class: "panel" }, h("h2", {}, "Header (in alto in ogni pagina)"),
      h("p", { class: "hint" }, "Il nome porta sempre alla home. Il sottotitolo vuoto non compare. Il menu è a destra: ogni voce ha un testo e un link."),
      field(hf.testata, "nome", "Nome"), field(hf.testata, "sottotitolo", "Sottotitolo"),
      h("div", { class: "field" }, h("span", {}, "Menu"), rowsEditor(hf.testata.menu, [["testo", "Testo (es. about)"], ["link", "Link (es. about.html)"]], changed)));

    const colsBox = h("div", { class: "hf-cols" });
    const drawCols = () => colsBox.replaceChildren(...hf.footer.colonne.map((c, i) => {
      const title = h("input", { type: "text", placeholder: "Titolo della colonna", "aria-label": "Titolo della colonna" });
      title.value = c.titolo;
      title.addEventListener("input", () => { c.titolo = title.value; changed(); });
      const move = (d) => { const j = i + d; const L = hf.footer.colonne; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; drawCols(); changed(); };
      return h("div", { class: "hf-col" },
        h("div", { class: "hf-col-head" }, title, h("div", { class: "row-tools" },
          h("button", { type: "button", title: "Sposta prima", disabled: i === 0 ? true : null, onclick: () => move(-1) }, "←"),
          h("button", { type: "button", title: "Sposta dopo", disabled: i === hf.footer.colonne.length - 1 ? true : null, onclick: () => move(1) }, "→"),
          h("button", { type: "button", title: "Togli la colonna", onclick: () => { if (!confirm(`Tolgo la colonna “${c.titolo || "senza titolo"}”?`)) return; hf.footer.colonne.splice(i, 1); drawCols(); changed(); } }, "×"))),
        rowsEditor(c.voci, [["testo", "Testo"], ["link", "Link (facoltativo)"]], changed, "+ Aggiungi riga"));
    }), h("button", { type: "button", class: "btn small", onclick: () => { hf.footer.colonne.push({ titolo: "", voci: [] }); drawCols(); changed(); } }, "+ Aggiungi colonna"));
    drawCols();

    const legal = h("div", {});
    [["footer.copyright", "Copyright"], ["footer.credito", "Credito del sito"], ["footer.piva", "Partita IVA"]].forEach(([path, label]) => {
      const id = "s" + path.replace(/\W/g, "-");
      const input = h("input", { id, type: "text" });
      input.value = getPath(data, path) || "";
      input.addEventListener("input", () => { draft.sito[path] = input.value.trim(); markDirty(); });
      legal.append(h("label", { class: "field", for: id }, h("span", {}, label), input));
    });

    const footer = h("section", { class: "panel" }, h("h2", {}, "Footer (in fondo a ogni pagina)"),
      h("p", { class: "hint" }, "Nei link puoi scrivere un indirizzo (https://…), una pagina del sito (es. about.html o index.html#cultura), una mail, @nome per Instagram o un file (es. assets/cv-simone-carducci.pdf). Una riga senza link resta semplice testo. Un testo vuoto non compare."),
      pair(hf.footer, "invito", "invito_link", "Scritta grande (es. Scrivimi)"),
      pair(hf.footer, "indirizzo", "indirizzo_link", "Riga sotto la scritta grande"),
      h("div", { class: "field" }, h("span", {}, "Colonne"), colsBox),
      h("div", { class: "field" }, h("span", {}, "Riga in fondo"), legal));
    return h("div", {}, header, footer);
  }

  function headerFooterChanges(fresh) {
    const hf = draft.hf;
    if (!hf || !hf.dirty) return;
    const clean = (rows) => rows.map((r) => ({ testo: (r.testo || "").trim(), link: (r.link || "").trim() })).filter((r) => r.testo);
    fresh.testata = { nome: hf.testata.nome.trim(), sottotitolo: hf.testata.sottotitolo.trim(), menu: clean(hf.testata.menu) };
    fresh.footer = {
      ...(fresh.footer && typeof fresh.footer === "object" ? fresh.footer : {}),
      invito: hf.footer.invito.trim(), invito_link: hf.footer.invito_link.trim(),
      indirizzo: hf.footer.indirizzo.trim(), indirizzo_link: hf.footer.indirizzo_link.trim(),
      colonne: hf.footer.colonne.map((c) => ({ titolo: c.titolo.trim(), voci: clean(c.voci) })).filter((c) => c.titolo || c.voci.length),
    };
  }

  // ---------------------------------------------------------------- Instagram posts (Bohème, modì)
  // content/instagram/<slug>.json = {titolo, post: [{url, immagine?, testo?, visibile}]}. A post with an image is a
  // tile linking to Instagram; without one the site uses Instagram's own embed. An empty list hides the section.

  const igCode = (url) => ((url.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|tv)\/([\w-]+)/) || [])[1] || "").replace(/[^\w-]/g, "");
  async function instagramPanel(node) {
    const slug = node.instagram;
    const path = `content/instagram/${slug}.json`;
    let data = {};
    try { data = JSON.parse(await readText(path, true) || "{}") || {}; } catch (e) { data = {}; }
    const ig = {
      path, slug, dirty: false,
      titolo: typeof data.titolo === "string" ? data.titolo : "Su Instagram",
      post: (Array.isArray(data.post) ? data.post : []).filter((x) => x && typeof x === "object").map((x) => ({
        url: x.url || "", testo: x.testo || "", visibile: x.visibile !== false,
        img: x.immagine && tree[x.immagine] ? { orig: x.immagine, url: siteUrl(x.immagine) } : null,
      })),
    };
    draft.ig = ig;
    const changed = () => { ig.dirty = true; markDirty(); };
    const title = h("input", { id: "ig-title", type: "text", placeholder: "Su Instagram" });
    title.value = ig.titolo;
    title.addEventListener("input", () => { ig.titolo = title.value; changed(); });
    const list = h("div", { class: "ig-list" });
    const draw = () => list.replaceChildren(...ig.post.map((pst, i) => {
      const url = h("input", { type: "url", placeholder: "Link del post (https://www.instagram.com/p/…)", "aria-label": "Link del post" });
      url.value = pst.url;
      url.addEventListener("input", () => { pst.url = url.value.trim(); changed(); });
      const cap = h("input", { type: "text", placeholder: "Didascalia (facoltativa)", "aria-label": "Didascalia" });
      cap.value = pst.testo;
      cap.addEventListener("input", () => { pst.testo = cap.value; changed(); });
      const file = h("input", { type: "file", accept: "image/*", hidden: "" });
      file.addEventListener("change", async () => { const f = file.files[0]; const ph = f && isImage(f) && await newPhoto(f, MAX_SIDE); if (ph) { pst.img = ph; draw(); changed(); } });
      const move = (d) => { const j = i + d; if (j < 0 || j >= ig.post.length) return; [ig.post[i], ig.post[j]] = [ig.post[j], ig.post[i]]; draw(); changed(); };
      return h("div", { class: "ig-item" + (pst.visibile ? "" : " off") },
        h("div", { class: "ig-thumb" }, pst.img ? h("img", { src: pst.img.url, alt: "" }) : h("span", { class: "ph" }, "senza foto: si vede il post di Instagram")),
        h("div", { class: "ig-fields" }, url, cap,
          h("div", { class: "photo-btns" },
            h("label", { class: "btn small" }, file, pst.img ? "Cambia foto" : "Carica una foto"),
            libButton(false, ([p]) => { pst.img = p; draw(); changed(); }),
            pst.img ? h("button", { type: "button", class: "btn small", onclick: () => { pst.img = null; draw(); changed(); } }, "Togli la foto") : null,
            h("span", { class: "head-switch" }, toggle(pst.visibile, (v) => { pst.visibile = v; changed(); draw(); }), h("small", {}, "Visibile")))),
        h("div", { class: "row-tools" },
          h("button", { type: "button", title: "Sposta su", disabled: i === 0 ? true : null, onclick: () => move(-1) }, "↑"),
          h("button", { type: "button", title: "Sposta giù", disabled: i === ig.post.length - 1 ? true : null, onclick: () => move(1) }, "↓"),
          h("button", { type: "button", title: "Togli il post", onclick: () => { ig.post.splice(i, 1); draw(); changed(); } }, "×")));
    }), h("button", { type: "button", class: "btn small", onclick: () => { ig.post.push({ url: "", testo: "", visibile: true, img: null }); draw(); changed(); list.querySelector(".ig-item:last-of-type input").focus(); } }, "+ Aggiungi un post"));
    draw();
    return h("section", { class: "panel" }, h("h2", {}, "Post di Instagram"),
      h("p", { class: "hint" }, "Incolla il link di ogni post (su Instagram: ··· → Copia link). Con una foto il post diventa un riquadro che porta a Instagram; senza foto il sito mostra il post di Instagram. Senza post la sezione non compare."),
      h("label", { class: "field", for: "ig-title" }, h("span", {}, "Titolo della sezione"), title),
      list);
  }

  // Videos under a culture page: content/video/<slug>.json = {titolo, video: [{url, testo}]} (YouTube or Vimeo links).
  async function videosPanel(node) {
    const path = `content/video/${node.videos}.json`;
    let data = {};
    try { data = JSON.parse(await readText(path, true) || "{}") || {}; } catch (e) { data = {}; }
    const vd = { path, dirty: false, titolo: typeof data.titolo === "string" ? data.titolo : "Video",
      video: (Array.isArray(data.video) ? data.video : []).filter((x) => x && typeof x === "object").map((x) => ({ url: x.url || "", testo: x.testo || "" })) };
    draft.vd = vd;
    const changed = () => { vd.dirty = true; markDirty(); };
    const title = h("input", { id: "vd-title", type: "text", placeholder: "Video" });
    title.value = vd.titolo;
    title.addEventListener("input", () => { vd.titolo = title.value; changed(); });
    return h("section", { class: "panel" }, h("h2", {}, "Video (YouTube o Vimeo)"),
      h("p", { class: "hint" }, "Incolla il link del video (su YouTube: Condividi → Copia link). Compaiono sotto le locandine: con più video c'è un solo player e sotto la lista per scegliere quale guardare, nell'ordine qui sotto, con la didascalia se la scrivi. Senza video la sezione non compare."),
      h("label", { class: "field", for: "vd-title" }, h("span", {}, "Titolo della sezione"), title),
      rowsEditor(vd.video, [["url", "Link (https://youtu.be/…)"], ["testo", "Didascalia (facoltativa)"]], changed, "+ Aggiungi un video"));
  }

  // Posters by category under a culture page: content/locandine/<slug>.json = {categorie: [{nome, cartella}]},
  // images in img/<slug>/<cartella>/01.jpg ... (one row per category on the page, arrows to change poster;
  // a category without images is hidden). Each image keeps the file it had when the panel opened, so a change
  // made elsewhere in the meantime can't shuffle them.
  const catFolder = (t) => (t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)) || "categoria";

  async function postersPanel(node) {
    const slug = node.posters;
    const path = `content/locandine/${slug}.json`;
    let data = {};
    try { data = JSON.parse(await readText(path, true) || "{}") || {}; } catch (e) { data = {}; }
    const filesOf = (dir) => Object.keys(tree).filter((p) => p.startsWith(dir + "/") && /^\d{2,}\.jpg$/.test(p.slice(dir.length + 1)))
      .sort((a, b) => parseInt(a.split("/").pop(), 10) - parseInt(b.split("/").pop(), 10))
      .map((p) => ({ orig: p, sha: tree[p], url: siteUrl(p) }));
    // print-quality original of a poster (for the download button): stampa/<slug>/<cartella>/NN.jpg or .png
    const rawOf = (p) => { const b = p.replace(/\.jpg$/, ""); const q = [".jpg", ".png"].map((e) => b + e).find((x) => tree[x]); return q ? { sha: tree[q], ext: q.slice(-3) } : null; };
    const ps = { path, slug, dirty: false, dimensione: ["piccole", "medie", "grandi"].includes(data.dimensione) ? data.dimensione : "medie",
      cats: (Array.isArray(data.categorie) ? data.categorie : []).filter((c) => c && typeof c === "object" && c.cartella).map((c) => ({
        nome: c.nome || "",
        scarica: c.scarica !== false,
        locandine: filesOf(`img/${slug}/${c.cartella}`).map((f) => ({ ...f, raw: rawOf(f.orig.replace(/^img\//, "stampa/")) })),
        foto: filesOf(`img/${slug}/${c.cartella}/foto`),
        video: (Array.isArray(c.video) ? c.video : []).filter((v) => v && typeof v === "object").map((v) => ({ url: v.url || "", testo: v.testo || "" })),
      })) };
    draft.posters = ps;
    const changed = () => { ps.dirty = true; markDirty(); };
    const list = h("div", { class: "pc-list" });
    // one list of images (posters or event photos): upload, library, drag files in, reorder, remove
    const images = (arr, label, addLabel, keepRaw) => {
      const file = h("input", { type: "file", accept: "image/*", multiple: "", hidden: "" });
      const add = async (files) => {
        for (const f of files) {
          const ph = isImage(f) && await newPhoto(f, MAX_SIDE);
          if (!ph) continue;
          // posters keep the original too (JPEG or PNG up to 25 MB), for the download button
          const ext = (f.name.match(/\.(jpe?g|png)$/i) || [])[1];
          if (keepRaw && ext && f.size <= 25e6) ph.raw = { blob: f, ext: ext.toLowerCase() === "png" ? "png" : "jpg" };
          arr.push(ph);
        }
        draw(); changed();
      };
      file.addEventListener("change", async () => { await add([...file.files]); file.value = ""; });
      const box = h("div", { class: "pc-images" },
        h("h4", {}, label, h("small", { class: "muted" }, arr.length ? ` · ${arr.length}` : " · nessuna: non compare")),
        arr.length ? h("ol", { class: "seq pc-seq" }, arr.map((f, i) => h("li", {},
          h("img", { src: f.url, alt: "" }),
          h("span", { class: "num" }, String(i + 1)),
          h("div", { class: "tools" },
            h("button", { type: "button", title: "Prima", onclick: () => { if (i) { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); draw(); changed(); } } }, "←"),
            h("button", { type: "button", title: "Togli", onclick: () => { arr.splice(i, 1); draw(); changed(); } }, "×"),
            h("button", { type: "button", title: "Dopo", onclick: () => { if (i < arr.length - 1) { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); draw(); changed(); } } }, "→"))))) : null,
        h("div", { class: "photo-btns" }, h("label", { class: "btn small" }, file, addLabel),
          libButton(true, (picked) => { arr.push(...picked); draw(); changed(); })));
      dropZone(box, add);
      return box;
    };
    const draw = () => list.replaceChildren(...ps.cats.map((cat, ci) => {
      const name = h("input", { type: "text", placeholder: "Nome della categoria (es. POP NO POP)", "aria-label": "Nome della categoria" });
      name.value = cat.nome;
      name.addEventListener("input", () => { cat.nome = name.value; changed(); });
      const moveCat = (d) => { const j = ci + d; if (j < 0 || j >= ps.cats.length) return; [ps.cats[ci], ps.cats[j]] = [ps.cats[j], ps.cats[ci]]; draw(); changed(); };
      const empty = !cat.locandine.length && !cat.foto.length && !cat.video.some((v) => v.url.trim());
      return h("div", { class: "pc-cat" + (empty ? " empty" : "") },
        h("div", { class: "pc-head" }, name,
          h("div", { class: "row-tools" },
            h("button", { type: "button", title: "Sposta su", disabled: ci === 0 ? true : null, onclick: () => moveCat(-1) }, "↑"),
            h("button", { type: "button", title: "Sposta giù", disabled: ci === ps.cats.length - 1 ? true : null, onclick: () => moveCat(1) }, "↓"),
            h("button", { type: "button", title: "Togli la categoria", onclick: () => {
              if (!empty && !confirm(`Togliere la categoria “${cat.nome || "senza nome"}” con tutte le sue immagini e i video?`)) return;
              ps.cats.splice(ci, 1); draw(); changed(); } }, "×"))),
        empty ? h("p", { class: "hint" }, "Ancora vuota: sul sito non compare finché non aggiungi qualcosa.") : null,
        images(cat.locandine, "Locandine (il mazzo: la prima è davanti)", "+ Carica locandine", true),
        cat.locandine.length ? h("div", { class: "head-switch" }, toggle(cat.scarica, (v) => { cat.scarica = v; changed(); }),
          h("small", {}, "Locandine scaricabili (pulsante “Scarica” sotto ognuna, in qualità originale per la stampa)")) : null,
        images(cat.foto, "Foto dell'evento", "+ Carica foto"),
        h("div", { class: "pc-images" }, h("h4", {}, "Video (YouTube o Vimeo, es. i DJ set)"),
          rowsEditor(cat.video, [["url", "Link (https://youtu.be/…)"], ["testo", "Didascalia (facoltativa)"]], changed, "+ Aggiungi un video")));
    }), h("button", { type: "button", class: "btn small", onclick: () => { ps.cats.push({ nome: "", scarica: true, locandine: [], foto: [], video: [] }); draw(); changed(); list.querySelector(".pc-cat:last-of-type input").focus(); } }, "+ Aggiungi una categoria"));
    draw();
    const size = h("select", { id: "pc-size" }, [["piccole", "Piccole"], ["medie", "Medie"], ["grandi", "Grandi"]].map(([v, t]) => h("option", { value: v }, t)));
    size.value = ps.dimensione;
    size.addEventListener("change", () => { ps.dimensione = size.value; changed(); });
    return h("section", { class: "panel" }, h("h2", { id: "pc-title" }, "Eventi per categoria"),
      h("label", { class: "field inline", for: "pc-size" }, h("span", {}, "Dimensione delle locandine"), size),
      h("p", { class: "hint" }, "Le locandine di tutte le categorie stanno su una riga, una colonna per categoria: ognuna è un mazzo di carte che si sfoglia con le frecce ← → (o con il dito). Sotto, per ogni categoria, le foto dell'evento e i video. L'ordine è quello qui sotto. Puoi trascinare le immagini dal Finder dentro un riquadro. Quello che è vuoto non compare sul sito, e nemmeno una categoria tutta vuota."),
      list);
  }

  async function postersChanges(out) {
    const ps = draft.posters;
    if (!ps || !ps.dirty) return;
    const used = new Set(), names = new Set(), categorie = [];
    await uploadAll(ps.cats.flatMap((c) => [...c.locandine, ...c.foto]).filter((f) => f.blob && !f.sha));
    await uploadAll(ps.cats.flatMap((c) => c.locandine.map((f) => f.raw)).filter((r) => r && r.blob && !r.sha));
    const place = (arr, dir) => arr.forEach((f, i) => {
      const target = `${dir}/${String(i + 1).padStart(2, "0")}.jpg`;
      used.add(target);
      // same place as when the panel opened: leave the file as it is now (the Action may have optimised it);
      // otherwise use the file the image had when the panel opened, so a change made elsewhere can't shuffle them
      if (f.orig === target && tree[target]) return;
      if (f.sha && tree[target] !== f.sha) out[target] = f.sha;
    });
    for (const cat of ps.cats) {
      const nome = cat.nome.trim();
      const video = cat.video.map((v) => ({ url: v.url.trim(), testo: v.testo.trim() })).filter((v) => v.url).map((v) => (v.testo ? v : { url: v.url }));
      if (!nome && !cat.locandine.length && !cat.foto.length && !video.length) continue;
      const base = catFolder(nome || "categoria");
      let folder = base, k = 2;
      while (names.has(folder)) folder = `${base}-${k++}`;
      names.add(folder);
      const entry = { nome: nome || "Senza nome", cartella: folder };
      if (!cat.scarica) entry.scarica = false;
      if (video.length) entry.video = video;
      categorie.push(entry);
      place(cat.locandine, `img/${ps.slug}/${folder}`);
      cat.locandine.forEach((f, i) => {
        if (!f.raw || !f.raw.sha) return;
        const target = `stampa/${ps.slug}/${folder}/${String(i + 1).padStart(2, "0")}.${f.raw.ext}`;
        used.add(target);
        if (tree[target] !== f.raw.sha) out[target] = f.raw.sha;
      });
      place(cat.foto, `img/${ps.slug}/${folder}/foto`);
    }
    // images of categories or places no longer used
    const mine = new RegExp(`^(img/${ps.slug}/[^/]+/(foto/)?\\d{2,}\\.jpg|stampa/${ps.slug}/[^/]+/\\d{2,}\\.(jpg|png))$`);
    Object.keys(tree).forEach((p) => { if (mine.test(p) && !used.has(p) && !(p in out)) out[p] = null; });
    const json = JSON.stringify(ps.dimensione === "medie" ? { categorie } : { dimensione: ps.dimensione, categorie }, null, 2) + "\n";
    if (json !== (texts[ps.path] || "")) out[ps.path] = await blobFrom({ text: json });
  }

  async function videosChanges(out) {
    const vd = draft.vd;
    if (!vd || !vd.dirty) return;
    const video = vd.video.map((v) => ({ url: v.url.trim(), testo: v.testo.trim() })).filter((v) => v.url)
      .map((v) => (v.testo ? v : { url: v.url }));
    const json = JSON.stringify({ titolo: vd.titolo.trim() || "Video", video }, null, 2) + "\n";
    if (json !== (texts[vd.path] || "")) out[vd.path] = await blobFrom({ text: json });
  }

  async function instagramChanges(out) {
    const ig = draft.ig;
    if (!ig || !ig.dirty) return;
    const used = new Set();
    const post = [];
    for (const [i, pst] of ig.post.entries()) {
      if (!pst.url) continue;
      const item = { url: pst.url };
      if (pst.img) {
        const target = `img/${ig.slug}/ig-${igCode(pst.url) || String(i + 1).padStart(2, "0")}.jpg`;
        const sha = (pst.img.orig && tree[pst.img.orig]) || pst.img.sha || (pst.img.sha = await blobFrom({ blob: pst.img.blob }));
        if (tree[target] !== sha) out[target] = sha;
        used.add(target);
        item.immagine = target;
      }
      if (pst.testo.trim()) item.testo = pst.testo.trim();
      item.visibile = pst.visibile;
      post.push(item);
    }
    // photos of posts that were removed or lost their photo
    Object.keys(tree).forEach((p) => { if (p.startsWith(`img/${ig.slug}/ig-`) && !used.has(p) && !(p in out)) out[p] = null; });
    const json = JSON.stringify({ titolo: ig.titolo.trim() || "Su Instagram", post }, null, 2) + "\n";
    if (json !== (texts[ig.path] || "")) out[ig.path] = await blobFrom({ text: json });
  }

  // ---------------------------------------------------------------- facts at the top of a page
  // content/schede/<slug>.json = {righe: [{etichetta, valore, link}]}; until it exists the rows are read
  // from the project sheet the way tools/build_pages.py does, so the first save keeps what the page shows today.

  function factsFromSheet(md) {
    const row = (etichetta, v) => {
      const m = v.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      return m ? { etichetta, valore: m[1], link: m[2] } : { etichetta, valore: v, link: v.startsWith("@") && !v.includes(" ") ? v : "" };
    };
    // culture pages: the "LABEL value · LABEL value" line in "## Testo pagina"
    const sec = (md.split(/^## Testo pagina.*$/m)[1] || "").split(/^## /m)[0];
    const line = sec.split("\n").map((l) => l.trim()).find((l) => /^[A-Z][A-Z &]+ /.test(l) && l.includes(" · "));
    if (line) {
      return line.split(" · ").map((p) => p.trim().match(/^([A-Z][A-Z &]*[A-Z])\s+(.+)$/)).filter(Boolean)
        .map((m) => row(m[1].toLowerCase().replace(/(^|[\s&])\S/g, (c) => c.toUpperCase()), m[2].replace(/\s*\(.*$/, "").trim()));
    }
    // other pages: the "- **Label:** value" lines above the first heading
    return md.split(/^## /m)[0].split("\n").map((l) => l.match(/^- \*\*(.+?):\*\*\s*(.*)$/))
      .filter((m) => m && !m[1].startsWith("Immagine")).map((m) => row(m[1], m[2].trim()));
  }

  async function factsPanel(node) {
    const path = `content/schede/${node.facts.slug}.json`;
    let rows = [];
    if (tree[path]) {
      try { rows = (JSON.parse(await readText(path)).righe || []).map((r) => ({ etichetta: r.etichetta || "", valore: r.valore || "", link: r.link || "" })); } catch (e) { rows = []; }
    } else if (node.facts.fromPage) {
      // About: the rows next to the portrait, as the published page shows them today
      const doc = new DOMParser().parseFromString(await readText(node.facts.fromPage) || "", "text/html");
      rows = [...doc.querySelectorAll(".about-facts > div")].map((d) => {
        const a = d.querySelector("dd a");
        return { etichetta: (d.querySelector("dt") || {}).textContent || "", valore: ((d.querySelector("dd") || {}).textContent || "").trim(), link: a ? a.getAttribute("href") : "" };
      });
    } else {
      rows = factsFromSheet(await readText(node.facts.doc));
    }
    draft.facts = { path, rows, dirty: false };
    const changed = () => { draft.facts.dirty = true; markDirty(); };
    const box = h("div", { class: "facts-edit sheet-edit" });
    const draw = () => box.replaceChildren(...rows.map((r, i) => {
      const inp = (key, ph) => {
        const el = h("input", { type: "text", placeholder: ph, "aria-label": ph });
        el.value = r[key];
        el.addEventListener("input", () => { r[key] = el.value; changed(); });
        return el;
      };
      const move = (d) => { const j = i + d; if (j < 0 || j >= rows.length) return; [rows[i], rows[j]] = [rows[j], rows[i]]; draw(); changed(); };
      return h("div", { class: "sheet-row" },
        inp("etichetta", "Etichetta (es. Year)"), inp("valore", "Valore (es. 2026)"), inp("link", "Link (facoltativo)"),
        h("div", { class: "row-tools" },
          h("button", { type: "button", title: "Sposta su", disabled: i === 0 ? true : null, onclick: () => move(-1) }, "↑"),
          h("button", { type: "button", title: "Sposta giù", disabled: i === rows.length - 1 ? true : null, onclick: () => move(1) }, "↓"),
          h("button", { type: "button", title: "Togli la voce", onclick: () => { rows.splice(i, 1); draw(); changed(); } }, "×")));
    }), h("button", { type: "button", class: "btn small", onclick: () => { rows.push({ etichetta: "", valore: "", link: "" }); draw(); changed(); box.querySelector(".sheet-row:last-of-type input").focus(); } }, "+ Aggiungi voce"));
    draw();
    return h("section", { class: "panel" }, h("h2", {}, node.facts.title || "Scheda dati in alto"),
      h("p", { class: "hint" }, (node.facts.intro || "Le voci sotto il titolo (Year, Creative direction, Where…).") + " Sul sito le etichette compaiono in maiuscolo. Nel link puoi scrivere un indirizzo (https://…), una pagina del sito (es. modi.html), una mail o @nome per Instagram; se lo lasci vuoto il valore resta semplice testo."),
      box);
  }

  // ---------------------------------------------------------------- texts

  // What is typed shows up in the preview at once (before saving), for the fields that name a "live" kind.
  const mdInline = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  function livePreview(kind, value) {
    let doc;
    try { doc = $("#preview iframe").contentDocument; } catch (e) { return; }
    if (!doc) return;
    if (kind === "about-statement") {
      const el = doc.querySelector(".about-statement");
      if (el) el.innerHTML = mdInline(value.trim().replace(/\s+/g, " "));
    } else if (kind === "about-bio") {
      // same rules as tools/build_pages.py: a **title** alone starts a section, the paragraphs below are its text
      const box = doc.querySelector(".about-text");
      if (!box) return;
      const blocks = [];
      value.split(/\n\s*\n/).map((x) => x.trim().replace(/\n/g, " ")).filter(Boolean).forEach((chunk) => {
        const m = chunk.match(/^\*\*(.+?)\*\*$/);
        if (m) blocks.push([m[1], []]);
        else if (!chunk.startsWith("[DA VERIFICARE") && blocks.length) blocks[blocks.length - 1][1].push(chunk);
      });
      box.querySelectorAll(".about-block").forEach((b) => b.remove());
      blocks.forEach(([title, paras]) => {
        const d = doc.createElement("div");
        d.className = "about-block";
        d.innerHTML = `<h2 class="label">${mdInline(title)}</h2>` + paras.map((x) => `<p>${mdInline(x)}</p>`).join("");
        box.append(d);
      });
    }
  }

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
        if (f.meta) input.dataset.meta = f.meta;
        if (spec.live) input.dataset.live = spec.live;
        input.addEventListener("input", () => { draft.texts[file + "\u0000" + (f.meta || f.section) + "\u0000" + (f.in || "")] = { f, value: input.value }; markDirty(); if (spec.live) livePreview(spec.live, input.value); });
        panel.append(h("label", { class: "field", for: id, "data-hide-meta": f.hideIf ? f.hideIf[0] : null, "data-hide-re": f.hideIf ? f.hideIf[1].source : null }, h("span", {}, f.label), input,
          /\[DA VERIFICARE/.test(value) ? h("small", { class: "verify" }, "Contiene una nota [DA VERIFICARE], evidenziata sul sito finché non la togli.") : null));
      }
    }
    // a field that does not apply (e.g. Pellicola when Supporto is Digitale) is hidden while that is true
    panel.querySelectorAll("[data-hide-meta]").forEach((label) => {
      const src = panel.querySelector(`[data-meta="${label.dataset.hideMeta}"]`);
      if (!src) return;
      const re = new RegExp(label.dataset.hideRe, "i");
      const sync = () => { label.hidden = re.test(src.value); };
      src.addEventListener("input", sync); sync();
    });
    panel.append(h("p", { class: "hint" }, "**grassetto**, _corsivo_, [testo del link](https://...). Un rigo vuoto separa i paragrafi. Un campo vuoto (o “–”) non compare sul sito."));
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
      cover: tree[coverPath] ? { orig: coverPath, sha0: tree[coverPath], url: siteUrl(coverPath) } : null,
      seq: [],
      removed: [],
    };
    if (ph.kind === "serie") {
      Object.keys(tree).filter((p) => p.startsWith(ph.dir + "/") && /^\d{2,}\.jpg$/.test(p.slice(ph.dir.length + 1)))
        .sort().forEach((p) => state.seq.push({ orig: p, sha0: tree[p], url: siteUrl(p) }));
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
      // texts between the photos: {dopo: photos before it, testo}
      // and videos: {dopo, video}
      const tx = (Array.isArray(layout.testi) ? layout.testi : []).filter((t) => t && (typeof t.testo === "string" || typeof t.video === "string"))
        .map((t) => ({ dopo: Math.max(0, Math.min(state.seq.length, parseInt(t.dopo, 10) || 0)), testo: t.testo, video: t.video }));
      for (let k = tx.length - 1; k >= 0; k--) {
        let at = 0, seen = 0;
        while (at < state.seq.length && seen < tx[k].dopo) { if (!state.seq[at].text) seen++; at++; }
        state.seq.splice(at, 0, typeof tx[k].video === "string" ? { text: true, video: tx[k].video } : { text: true, testo: tx[k].testo });
      }
    }
    draft.photos = { node, state, coverPath, layout };

    const coverBox = h("div", { class: "cover-slot" });
    const drawCover = () => coverBox.replaceChildren(
      state.cover ? h("img", { src: state.cover.url, alt: "" }) : h("span", { class: "ph" }, "Nessuna foto"),
      h("label", { class: "btn" }, state.cover ? "Sostituisci" : "Carica",
        h("input", { type: "file", accept: "image/*", hidden: true, onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          const p = await newPhoto(f, MAX_SIDE); if (p) { state.cover = p; drawCover(); markDirty(); }
        } })),
      libButton(false, ([p]) => { state.cover = p; drawCover(); markDirty(); }));
    drawCover();
    dropZone(coverBox, async (files) => { const p = await newPhoto(files[0], MAX_SIDE); if (p) { state.cover = p; drawCover(); markDirty(); } });
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
        // texts split the photos into runs; on the site each run starts the layout again
        const pos = [];
        let k = 0, row = 0, maxRow = 0, photoNo = 0;
        const runPlaces = (from) => { let n = 0; for (let j = from; j < state.seq.length && !state.seq[j].text; j++) n++; return schema ? placeAll(schema, n) : []; };
        let places = runPlaces(0);
        state.seq.forEach((it, j) => {
          if (it.text) { row = maxRow + 1; maxRow = row; pos.push({ row }); k = 0; places = runPlaces(j + 1); return; }
          const pl = places[k];
          if (pl) maxRow = Math.max(maxRow, row + pl[2]);
          pos.push({ k, pl, row, n: ++photoNo }); k++;
        });
        grid.replaceChildren(...state.seq.map((it, i) => {
          const at = pos[i];
          const drag = (li) => {
            li.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/x-seq", String(i)); li.classList.add("dragging"); });
            li.addEventListener("dragend", () => li.classList.remove("dragging"));
            li.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("text/x-seq")) e.preventDefault(); });
            li.addEventListener("drop", (e) => { const from = e.dataTransfer.getData("text/x-seq"); if (from === "") return; e.preventDefault(); e.stopPropagation(); move(+from, i); });
            return li;
          };
          if (it.text && "video" in it) {
            return drag(h("li", { class: "text video", draggable: "true", style: schema ? `grid-row: ${at.row}` : null },
              h("span", { class: "grip", title: "Trascina per spostare" }, "⋮⋮ video"),
              videoField(() => it.video, (v) => { it.video = v; markDirty(); }),
              h("span", { class: "text-tools" },
                h("button", { type: "button", title: "Prima", onclick: () => move(i, i - 1) }, "↑"),
                h("button", { type: "button", title: "Dopo", onclick: () => move(i, i + 1) }, "↓"),
                h("button", { type: "button", title: "Togli il video", onclick: () => { state.seq.splice(i, 1); draw(); markDirty(); } }, "×"))));
          }
          if (it.text) {
            const ta = h("textarea", { rows: 3, placeholder: "Testo tra le foto…", "aria-label": "Testo tra le foto" });
            ta.value = it.testo || "";
            ta.addEventListener("input", () => { it.testo = ta.value; markDirty(); });
            return drag(h("li", { class: "text", draggable: "true", style: schema ? `grid-row: ${at.row}` : null },
              h("span", { class: "grip", title: "Trascina per spostare" }, "⋮⋮ testo"), ta,
              h("span", { class: "text-tools" },
                h("button", { type: "button", title: "Prima", onclick: () => move(i, i - 1) }, "↑"),
                h("button", { type: "button", title: "Dopo", onclick: () => move(i, i + 1) }, "↓"),
                h("button", { type: "button", title: "Togli il testo", onclick: () => { state.seq.splice(i, 1); draw(); markDirty(); } }, "×"))));
          }
          const cls = [at.k % 2 ? "alt" : "", at.k % 3 === 0 ? "wide" : ""].filter(Boolean).join(" ");
          const li = h("li", { draggable: "true", class: cls || null, style: at.pl ? `grid-column: ${at.pl[0]} / span ${at.pl[1]}; grid-row: ${at.row + at.pl[2]}` : null },
            h("img", { src: it.url, alt: "" }),
            h("span", { class: "num" }, String(at.n).padStart(2, "0")),
            h("span", { class: "tools" },
              h("button", { type: "button", title: "Prima", onclick: () => move(i, i - 1) }, "←"),
              h("button", { type: "button", title: "Dopo", onclick: () => move(i, i + 1) }, "→"),
              h("button", { type: "button", title: "Usa come copertina", onclick: () => { state.cover = { ...it }; drawCover(); markDirty(); } }, "★"),
              h("button", { type: "button", title: "Togli", onclick: () => { state.seq.splice(i, 1); draw(); markDirty(); } }, "×")),
          );
          return drag(li);
        }), h("li", { class: "add", style: schema ? `grid-row: ${maxRow + 1}` : null }, h("label", {}, "+ Aggiungi foto",
          h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: (e) => addFiles(e.target.files) })),
          libButton(true, (list) => { state.seq.push(...list); draw(); markDirty(); }),
          ph.layout ? h("button", { type: "button", class: "add-text", onclick: () => { state.seq.push({ text: true, testo: "" }); draw(); markDirty();
            const tas = grid.querySelectorAll("li.text textarea"); if (tas.length) tas[tas.length - 1].focus(); } }, "+ Aggiungi testo") : null,
          ph.layout ? h("button", { type: "button", class: "add-text", onclick: () => { state.seq.push({ text: true, video: "" }); draw(); markDirty();
            const ins = grid.querySelectorAll("li.video input[type=text]"); if (ins.length) ins[ins.length - 1].focus(); } }, "+ Aggiungi video") : null));
      };
      const move = (a, b) => {
        if (b < 0 || b >= state.seq.length) return;
        const [it] = state.seq.splice(a, 1); state.seq.splice(b, 0, it); draw(); markDirty();
      };
      const addFiles = async (files) => {
        for (const f of files) { const p = isImage(f) && await newPhoto(f, MAX_SIDE); if (p) state.seq.push(p); }
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

  // Upload new photos 4 at a time, showing the progress; each keeps its blob sha so a retry does not resend it
  async function uploadAll(items) {
    const todo = items.filter((it) => !it.sha);
    let done = 0;
    const st = () => $("#save-state");
    const show = () => { if (st() && todo.length) st().textContent = `Carico le foto: ${done}/${todo.length}…`; };
    show();
    const queue = [...todo];
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length) {
        const it = queue.shift();
        it.sha = await blobFrom({ blob: it.blob });
        done++; show();
      }
    }));
    if (st() && todo.length) st().textContent = "Pubblico…";
  }

  // Files from the Finder sometimes come without a type (HEIC): look at the name too
  const isImage = (f) => f.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp|tiff?|avif)$/i.test(f.name);

  async function newPhoto(file, side) {
    try {
      const blob = await toJpeg(file, side);
      if (!blob) throw new Error("conversione non riuscita");
      return { blob, url: URL.createObjectURL(blob), name: file.name };
    } catch (e) {
      alert(`Non riesco a leggere “${file.name}”` + (/\.hei[cf]$/i.test(file.name)
        ? ": è una foto HEIC, che questo browser non apre. Aprila con Safari, oppure esportala in JPEG (Anteprima → Esporta) e riprova."
        : ": esportala in JPEG e riprova."));
      return null;
    }
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
    const input = h("input", { type: "text", placeholder: "es. 01home/03ricerca_visiva/03faccini", value: data.cartella || "" });
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
    if (draft.stileBlocked) { alert("Alcuni colori non sono abbastanza leggibili (vedi l'avviso in Stile del sito): correggili o torna allo stile di Figma."); return; }
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
        if (draft.builder) await builderChanges(out);
        if (draft.foci) await libraryChanges(out);
        if (draft.seo) await seoChanges(out);
        if (draft.icona) {
          if (draft.icona.remove) { if (tree[ICON_FILE]) out[ICON_FILE] = null; }
          else out[ICON_FILE] = draft.icona.sha || (draft.icona.sha = await blobFrom({ blob: draft.icona.blob }));
        }
        await instagramChanges(out);
        await videosChanges(out);
        await postersChanges(out);
        // facts at the top of the page
        if (draft.facts && draft.facts.dirty) {
          const righe = draft.facts.rows.map((r) => ({ etichetta: r.etichetta.trim(), valore: r.valore.trim(), link: r.link.trim() }))
            .filter((r) => r.etichetta || r.valore);
          out[draft.facts.path] = await blobFrom({ text: JSON.stringify({ righe }, null, 2) + "\n" });
        }
        // site settings (and the "in costruzione" switch of this page)
        if ((draft.sito && Object.keys(draft.sito).length) || draft.building != null || draft.stile || (draft.hf && draft.hf.dirty)) {
          const fresh = JSON.parse(await readText(SITO_FILE, true) || "{}");
          headerFooterChanges(fresh);
          for (const [path, v] of Object.entries(draft.sito || {})) setPath(fresh, path, v);
          if (draft.stile) {
            const st = {};
            if (draft.stile.font) st.font = draft.stile.font;
            const col = Object.fromEntries(Object.entries(draft.stile.colori || {}).filter(([, v]) => v));
            if (Object.keys(col).length) st.colori = col;
            if (draft.stile.testo) st.testo = draft.stile.testo;
            if (draft.stile.spazi) st.spazi = draft.stile.spazi;
            if (Object.keys(st).length) fresh.stile = st; else delete fresh.stile;
          }
          if (draft.building != null) {
            const list = new Set(Array.isArray(fresh.in_costruzione) ? fresh.in_costruzione : []);
            if (draft.building) list.add(pageSlug(node)); else list.delete(pageSlug(node));
            fresh.in_costruzione = [...list].sort();
          }
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
          // a photo already online that stays in its place is left alone (the Action may have optimised it meanwhile);
          // a moved one takes the current file of its old place; a new one is uploaded once
          const seqPhotos = state.seq.filter((it) => !it.text);
          const fresh = [state.cover, ...seqPhotos].filter((it) => it && it.blob && !it.sha);
          await uploadAll(fresh);
          // a moved photo takes the file its old place had when the panel opened: if that place changed elsewhere in the
          // meantime (Mac folder, another tab), the current file there is a different photo
          const shaOf = (it) => (it.orig && (it.sha0 || tree[it.orig])) || it.sha;
          if (state.cover && state.cover.orig !== coverPath && shaOf(state.cover)) out[coverPath] = shaOf(state.cover);
          if (n.photos.kind === "serie") {
            const dir = n.photos.dir;
            for (let i = 0; i < seqPhotos.length; i++) {
              const p = `${dir}/${String(i + 1).padStart(2, "0")}.jpg`;
              const it = seqPhotos[i];
              if (it.orig === p) continue;
              const s = shaOf(it);
              if (s && tree[p] !== s) out[p] = s;
            }
            Object.keys(tree).forEach((p) => {
              const m = p.startsWith(dir + "/") && p.slice(dir.length + 1).match(/^(\d{2,})\.jpg$/);
              if (m && parseInt(m[1], 10) > seqPhotos.length) out[p] = null;
            });
          }
          // focal points follow the photos
          const pairs = n.photos.kind === "serie"
            ? seqPhotos.map((it, i) => ({ from: it.orig || it.from, to: `${n.photos.dir}/${String(i + 1).padStart(2, "0")}.jpg` })) : [];
          if (state.cover) pairs.push({ from: state.cover.orig || state.cover.from, to: coverPath });
          if (pairs.some((x) => x.from !== x.to)) await fociFollow(out, pairs, n.photos.kind === "serie" ? n.photos.dir : null);
          if (draft.photos.layout) {
            const fresh = JSON.parse(await readText(n.photos.layout, true) || "{}");
            const { foto, ...rest } = fresh; // "foto" = per-photo sizes of the first version, no longer used
            delete rest.schema;
            const page = { ...rest, copertina: state.coverBig, layout: state.layout };
            if (state.layout === "casuale") page.schema = state.schema;
            delete page.testi;
            let before = 0;
            const testi = [];
            const slugOf = n.photos.dir.replace(/^img\//, "");
            for (const it of state.seq) {
              if (!it.text) before++;
              else if ("video" in it) { const v = await putVideo(it.video, slugOf, out); if (v) testi.push({ dopo: before, video: v }); }
              else if ((it.testo || "").trim()) testi.push({ dopo: before, testo: it.testo.trim() });
            }
            dropUnusedMedia(slugOf, new Set(testi.map((t) => t.video).filter(Boolean)), out);
            if (testi.length) page.testi = testi;
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
      if (draft.photos) { // what was saved is now the online version
        const { state, coverPath, node: n } = draft.photos;
        if (state.cover) { state.cover.orig = coverPath; state.cover.sha0 = tree[coverPath]; }
        state.seq.filter((it) => !it.text).forEach((it, i) => { it.orig = `${n.photos.dir}/${String(i + 1).padStart(2, "0")}.jpg`; it.sha0 = tree[it.orig]; });
      }
      if (draft.home || Object.keys(draft.switches).length) { await applyHome(); renderNav(); }
      if (draft.builder) { await applyPages(); renderNav(); }
      if (draft.building != null) { await loadBuilding(); renderNav(); }
      if (!sha) { st.textContent = "Niente da salvare"; return; }
      st.textContent = "Salvato. Il sito si aggiorna in 1-2 minuti…";
      waitPublished(sha, node);
    } catch (e) {
      btn.disabled = false;
      st.textContent = "Non salvato: " + why(e);
      alert("Salvataggio non riuscito: " + why(e));
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
    if (current !== node) return setPreview(node.page, true);
    if (draft && draft.dirty) { if (st()) st().textContent = "Online ✓ · hai altre modifiche da salvare"; return; }
    setPreview(node.page, true);
    await open(node);
    if (st()) st().textContent = "Online ✓ (se non vedi la modifica, ricarica la pagina)";
  }

  // ---------------------------------------------------------------- photo library
  // Every photo of the site, by folder. A photo can be reused in another page ("Dalla libreria" next to each
  // upload button: the file is copied, nothing is uploaded again), cropped, and given a focal point:
  // content/fuochi.json = {"img/x/01.jpg": [x%, y%]}, the point that stays in view when the site crops the photo.

  const FOCI_FILE = "content/fuochi.json";
  let FOCI = {};
  async function loadFoci() {
    try { FOCI = JSON.parse(await readText(FOCI_FILE, true) || "{}") || {}; } catch (e) { FOCI = {}; }
  }
  const libPhotos = () => Object.keys(tree).filter((p) => /^img\/.+\.(jpe?g|png|webp)$/i.test(p) && !p.includes("/thumbs/")).sort();
  const folderOf = (p) => p.split("/").slice(1, -1).join("/") || "(sito)";
  const thumbOf = (p) => { const t = p.replace(/^img\/archivio\//, "img/archivio/thumbs/"); return siteUrl(tree[t] ? t : p); };
  const byFolder = (paths) => { const g = {}; paths.forEach((p) => { (g[folderOf(p)] = g[folderOf(p)] || []).push(p); }); return g; };

  function libraryGrid(onPick, selected) {
    const search = h("input", { type: "search", class: "lib-search", placeholder: "Cerca una cartella (es. torino, archivio)…", "aria-label": "Cerca una cartella" });
    const groups = h("div", { class: "lib-groups" });
    const draw = () => {
      const q = norm(search.value.trim());
      const g = byFolder(libPhotos());
      groups.replaceChildren(...Object.entries(g).filter(([f]) => !q || norm(f).includes(q)).map(([f, ps]) => h("section", { class: "lib-group" },
        h("h3", {}, f, h("small", {}, ` ${ps.length} foto`)),
        h("ol", { class: "lib-grid" }, ps.map((p) => h("li", { class: selected && selected.has(p) ? "on" : null },
          h("button", { type: "button", title: p, onclick: (e) => onPick(p, e.currentTarget.parentNode) },
            h("img", { src: thumbOf(p), alt: "", loading: "lazy" }),
            FOCI[p] ? h("span", { class: "dot", style: `left:${FOCI[p][0]}%;top:${FOCI[p][1]}%` }) : null)))))));
    };
    search.addEventListener("input", draw);
    draw();
    return { el: h("div", { class: "lib" }, search, groups), redraw: draw };
  }

  // Modal picker: resolves to [{sha, url, from}] (empty if closed)
  function libraryPick(multiple) {
    return new Promise((resolve) => {
      const chosen = new Set();
      const done = (list) => { overlay.remove(); document.removeEventListener("keydown", esc); resolve(list); };
      const esc = (e) => { if (e.key === "Escape") done([]); };
      const use = h("button", { type: "button", class: "primary", disabled: true, onclick: () => done([...chosen].map((p) => ({ sha: tree[p], url: siteUrl(p), from: p }))) }, "Usa");
      const grid = libraryGrid((p, li) => {
        if (!multiple) { done([{ sha: tree[p], url: siteUrl(p), from: p }]); return; }
        if (chosen.has(p)) chosen.delete(p); else chosen.add(p);
        li.classList.toggle("on", chosen.has(p));
        use.disabled = !chosen.size;
        use.textContent = chosen.size ? `Usa ${chosen.size} foto` : "Usa";
      }, chosen);
      const overlay = h("div", { class: "lib-modal", role: "dialog", "aria-modal": "true", "aria-label": "Libreria foto" },
        h("div", { class: "lib-box" },
          h("header", {}, h("h2", {}, "Libreria foto"), h("span", { class: "muted" }, multiple ? "scegli una o più foto" : "scegli una foto"),
            h("button", { type: "button", class: "close", "aria-label": "Chiudi", onclick: () => done([]) }, "×")),
          grid.el,
          multiple ? h("footer", {}, use) : null));
      overlay.addEventListener("click", (e) => { if (e.target === overlay) done([]); });
      document.addEventListener("keydown", esc);
      document.body.append(overlay);
      overlay.querySelector(".lib-search").focus();
    });
  }

  const libButton = (multiple, onPicked) => h("button", { type: "button", class: "btn small lib-btn",
    onclick: async () => { const list = await libraryPick(multiple); if (list.length) onPicked(list); } }, "Dalla libreria");

  const RATIOS = [["", "Nessun ritaglio"], ["1:1", "1:1"], ["4:5", "4:5"], ["3:2", "3:2"], ["2:3", "2:3"], ["4:3", "4:3"], ["16:9", "16:9"]];

  function cropBox(w, hh, ratio, zoom, f) {
    const [a, b] = ratio.split(":").map(Number);
    const r = a / b;
    let cw = Math.min(w, hh * r) / zoom, ch = cw / r;
    let x = f[0] / 100 * w - cw / 2, y = f[1] / 100 * hh - ch / 2;
    x = Math.max(0, Math.min(w - cw, x)); y = Math.max(0, Math.min(hh - ch, y));
    return { x, y, cw, ch };
  }

  async function libraryPanel() {
    await loadFoci();
    draft.foci = { ...FOCI };
    draft.crops = {};
    const editor = h("div", { class: "lib-editor" }, h("p", { class: "muted" }, "Scegli una foto qui sotto per il punto di fuoco o per ritagliarla."));
    let grid;
    const edit = (p) => {
      const f = draft.foci[p] || [50, 50];
      let ratio = "", zoom = 1;
      const im = h("img", { src: draft.crops[p] ? draft.crops[p].url : siteUrl(p), alt: "" });
      const dot = h("span", { class: "focus-dot" });
      const box = h("span", { class: "crop-box" });
      const stage = h("div", { class: "focus-stage" }, im, box, dot);
      const sync = () => {
        dot.style.left = f[0] + "%"; dot.style.top = f[1] + "%";
        if (!ratio || !im.naturalWidth) { box.hidden = true; return; }
        const w = im.naturalWidth, hh = im.naturalHeight, c = cropBox(w, hh, ratio, zoom, f);
        Object.assign(box.style, { left: c.x / w * 100 + "%", top: c.y / hh * 100 + "%", width: c.cw / w * 100 + "%", height: c.ch / hh * 100 + "%" });
        box.hidden = false;
      };
      im.addEventListener("load", sync);
      stage.addEventListener("click", (e) => {
        const r = im.getBoundingClientRect();
        f[0] = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100);
        f[1] = Math.round(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * 100);
        draft.foci[p] = [f[0], f[1]];
        markDirty(); sync(); grid.redraw();
      });
      const ratioSel = h("select", { "aria-label": "Formato del ritaglio" }, RATIOS.map(([v, t]) => h("option", { value: v }, t)));
      const zoomIn = h("input", { type: "range", min: "1", max: "3", step: "0.05", value: "1", "aria-label": "Zoom del ritaglio" });
      const apply = h("button", { type: "button", class: "btn small", disabled: true }, "Ritaglia");
      ratioSel.addEventListener("change", () => { ratio = ratioSel.value; apply.disabled = !ratio; sync(); });
      zoomIn.addEventListener("input", () => { zoom = parseFloat(zoomIn.value); sync(); });
      apply.addEventListener("click", async () => {
        const w = im.naturalWidth, hh = im.naturalHeight, c = cropBox(w, hh, ratio, zoom, f);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(c.cw); canvas.height = Math.round(c.ch);
        const src = new Image();
        src.crossOrigin = "anonymous";
        src.src = im.src;
        await src.decode();
        canvas.getContext("2d").drawImage(src, c.x, c.y, c.cw, c.ch, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
        draft.crops[p] = { blob, url: URL.createObjectURL(blob) };
        // the focal point stays on the same spot of the photo
        draft.foci[p] = [Math.round((f[0] / 100 * w - c.x) / c.cw * 100), Math.round((f[1] / 100 * hh - c.y) / c.ch * 100)];
        f[0] = draft.foci[p][0]; f[1] = draft.foci[p][1];
        ratio = ""; ratioSel.value = ""; zoom = 1; zoomIn.value = "1"; apply.disabled = true;
        im.src = draft.crops[p].url;
        markDirty();
      });
      const reset = h("button", { type: "button", class: "btn small", onclick: () => { f[0] = 50; f[1] = 50; delete draft.foci[p]; markDirty(); sync(); grid.redraw(); } }, "Centro");
      editor.replaceChildren(
        h("h3", {}, p, h("a", { href: SITE + p, target: "_blank", rel: "noopener", class: "muted" }, " apri ↗")),
        stage,
        h("p", { class: "hint" }, "Clic sulla foto: punto di fuoco (il punto che resta in vista quando il sito taglia la foto, es. in home o in alto nelle pagine). Il ritaglio taglia davvero la foto, intorno al punto di fuoco; si può annullare dalla Cronologia."),
        h("div", { class: "lib-tools" }, reset, h("label", {}, "Ritaglio ", ratioSel), h("label", {}, "Zoom ", zoomIn), apply));
      sync();
      editor.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    grid = libraryGrid((p) => edit(p));
    return h("section", { class: "panel" }, h("h2", {}, "Tutte le foto del sito"),
      h("p", { class: "hint" }, "Le foto restano nelle loro cartelle. Per usarne una in un'altra pagina, nella pagina premi “Dalla libreria”. Il pallino segna il punto di fuoco."),
      editor, grid.el);
  }

  async function libraryChanges(out) {
    for (const [p, c] of Object.entries(draft.crops || {})) out[p] = await blobFrom({ blob: c.blob });
    const json = JSON.stringify(Object.fromEntries(Object.entries(draft.foci).filter(([p]) => tree[p] || out[p]).sort()), null, 2) + "\n";
    if (json !== (texts[FOCI_FILE] || "{}\n")) out[FOCI_FILE] = await blobFrom({ text: json });
  }

  // when photos of a page move (01 -> 03) or come from the library, their focal point goes with them.
  // pairs: [{from, to}] for every photo of the page (from = where the photo was, or the library photo)
  async function fociFollow(out, pairs, dir) {
    await loadFoci();
    const next = { ...FOCI };
    Object.keys(next).forEach((p) => { if (dir && p.startsWith(dir + "/") && /\/\d{2,}\.jpg$/.test(p)) delete next[p]; });
    pairs.forEach(({ to }) => { delete next[to]; });
    pairs.forEach(({ from, to }) => { if (from && FOCI[from]) next[to] = FOCI[from]; });
    const json = JSON.stringify(Object.fromEntries(Object.entries(next).sort()), null, 2) + "\n";
    if (json !== (texts[FOCI_FILE] || "{}\n") && (Object.keys(next).length || tree[FOCI_FILE])) out[FOCI_FILE] = await blobFrom({ text: json });
  }

  // ---------------------------------------------------------------- SEO and sharing
  // content/seo.json = {"<page>": {titolo, descrizione, immagine}}: what Google shows and the card when the page
  // is shared (WhatsApp, LinkedIn...). Empty fields = automatic (page title, page description, page cover).

  const SEO_FILE = "content/seo.json";
  const seoKey = (n) => (n && n.id === "home" ? "index" : pageSlug(n));

  async function seoPanel(node) {
    const key = seoKey(node);
    let all = {};
    try { all = JSON.parse(await readText(SEO_FILE, true) || "{}") || {}; } catch (e) { all = {}; }
    const entry = { titolo: "", descrizione: "", immagine: "", ...(all[key] || {}) };
    // what the page has today, read from the published HTML, shown as placeholder and in the preview
    const doc = new DOMParser().parseFromString(await readText(`${key}.html`) || "", "text/html");
    const meta = (sel) => (doc.querySelector(sel) || {}).content || "";
    const auto = {
      titolo: (doc.querySelector("title") || {}).textContent || node.title,
      descrizione: meta('meta[name="description"]'),
      immagine: (meta('meta[property="og:image"]').match(/simonecarducci\/(img\/.+)$/) || [])[1] || "",
    };
    if (entry.titolo === auto.titolo) entry.titolo = "";
    draft.seo = { key, entry, upload: null };
    const changed = () => { render(); markDirty(); };
    const counter = (input, max) => {
      const c = h("small", { class: "count" });
      const upd = () => { const n = (input.value || input.placeholder).length; c.textContent = `${n} / ${max}`; c.classList.toggle("over", n > max); };
      input.addEventListener("input", upd); upd();
      return c;
    };
    const t = h("input", { type: "text", id: "seo-t", placeholder: auto.titolo });
    t.value = entry.titolo;
    t.addEventListener("input", () => { entry.titolo = t.value.trim(); changed(); });
    const d = h("textarea", { id: "seo-d", rows: 3, placeholder: auto.descrizione });
    d.value = entry.descrizione;
    d.addEventListener("input", () => { entry.descrizione = d.value.replace(/\s+/g, " ").trim(); changed(); });
    const imgBox = h("div", { class: "seo-img" });
    const imgUrl = () => (draft.seo.upload ? draft.seo.upload.url : entry.immagine ? siteUrl(entry.immagine) : auto.immagine ? siteUrl(auto.immagine) : null);
    const google = h("div", { class: "seo-google" });
    const card = h("div", { class: "seo-card" });
    const render = () => {
      const title = entry.titolo || auto.titolo, desc = entry.descrizione || auto.descrizione, src = imgUrl();
      google.replaceChildren(h("small", {}, "bohememag.it › simonecarducci" + (key === "index" ? "" : ` › ${key}`)),
        h("strong", {}, title.length > 62 ? title.slice(0, 60) + "…" : title),
        h("p", {}, desc.length > 160 ? desc.slice(0, 157) + "…" : desc));
      card.replaceChildren(src ? h("img", { src, alt: "" }) : h("div", { class: "ph" }, "nessuna immagine"),
        h("div", {}, h("small", {}, "bohememag.it"), h("strong", {}, title), h("p", {}, desc)));
      imgBox.replaceChildren(
        h("span", { class: "muted" }, draft.seo.upload ? "Foto nuova (si carica al salvataggio)" : entry.immagine ? entry.immagine : auto.immagine ? `Automatica: ${auto.immagine}` : "Nessuna"),
        h("div", { class: "photo-btns" },
          libButton(false, ([p]) => { entry.immagine = p.from; draft.seo.upload = null; changed(); }),
          (() => {
            const inp = h("input", { type: "file", accept: "image/*", hidden: "" });
            inp.addEventListener("change", async () => { const f = inp.files[0]; const p = f && isImage(f) && await newPhoto(f, MAX_SIDE); if (p) { draft.seo.upload = p; changed(); } });
            return h("label", { class: "btn small" }, inp, "Carica una foto");
          })(),
          entry.immagine || draft.seo.upload ? h("button", { type: "button", class: "btn small", onclick: () => { entry.immagine = ""; draft.seo.upload = null; changed(); } }, "Automatica") : null));
    };
    render();
    return h("section", { class: "panel" }, h("h2", {}, "Google e condivisione"),
      h("p", { class: "hint" }, "Come appare la pagina su Google e quando la condividi (WhatsApp, LinkedIn, Instagram…). Lascia vuoto per usare titolo, descrizione e copertina della pagina."),
      h("label", { class: "field", for: "seo-t" }, h("span", {}, "Titolo (fino a 60 caratteri)"), t, counter(t, 60)),
      h("label", { class: "field", for: "seo-d" }, h("span", {}, "Descrizione (fino a 155 caratteri)"), d, counter(d, 155)),
      h("div", { class: "field" }, h("span", {}, "Immagine di anteprima (ideale 1200 × 630, orizzontale)"), imgBox),
      h("div", { class: "seo-previews" }, h("div", {}, h("h3", {}, "Su Google"), google), h("div", {}, h("h3", {}, "Condivisa"), card)));
  }

  async function seoChanges(out) {
    const { key, entry, upload } = draft.seo;
    if (upload) {
      const path = `img/seo/${key}.jpg`;
      if (!upload.sha) upload.sha = await blobFrom({ blob: upload.blob });
      out[path] = upload.sha;
      entry.immagine = path;
    }
    const all = JSON.parse(await readText(SEO_FILE, true) || "{}") || {};
    const clean = Object.fromEntries(Object.entries(entry).filter(([, v]) => v));
    if (Object.keys(clean).length) all[key] = clean; else delete all[key];
    const json = JSON.stringify(Object.fromEntries(Object.entries(all).sort()), null, 2) + "\n";
    if (json !== (texts[SEO_FILE] || "{}\n") && (Object.keys(all).length || tree[SEO_FILE])) out[SEO_FILE] = await blobFrom({ text: json });
  }

  // ---------------------------------------------------------------- history
  // Every save is a commit, so any earlier version of an element can come back: the files of the element
  // (its photos folder, layout, page JSON...) are set as they were after that commit, and the text fields it
  // shares with other elements (e.g. docs/CONTENUTI.md) are put back one by one, so the rest of the file stays.

  function historyTargets(node) {
    const whole = new Set(), prefixes = new Set(), fields = [];
    for (const spec of node.texts || []) {
      if (spec.sections) whole.add(spec.sections);
      else if (spec.file) fields.push(spec);
    }
    const ph = node.photos;
    if (ph && ph.kind === "serie") { prefixes.add(ph.dir + "/"); if (ph.layout) whole.add(ph.layout); }
    if (ph && ph.kind === "singola") whole.add(ph.file);
    if (ph && ph.kind === "archivio") prefixes.add("img/archivio/");
    if (node.facts) whole.add(`content/schede/${node.facts.slug}.json`);
    if (node.freePage) { whole.add(`${PAGE_DIR}${node.freePage}.json`); prefixes.add(`img/${node.freePage}/`); }
    if (node.settings || node.headerFooter) whole.add(SITO_FILE);
    if (node.instagram) whole.add(`content/instagram/${node.instagram}.json`);
    if (node.videos) whole.add(`content/video/${node.videos}.json`);
    if (node.posters) { whole.add(`content/locandine/${node.posters}.json`); prefixes.add(`img/${node.posters}/`); prefixes.add(`stampa/${node.posters}/`); }
    if (node.id === "home" || node.homeList) whole.add("content/home.json");
    return { whole: [...whole], prefixes: [...prefixes], fields };
  }

  const isBot = (c) => /\[bot\]$/.test((c.author && c.author.login) || "") || /github-actions/.test(c.commit.author.name || "");

  async function versions(hist) {
    const paths = [...hist.whole, ...hist.prefixes.map((p) => p.replace(/\/$/, "")), ...new Set(hist.fields.map((f) => f.file))];
    const lists = await Promise.all(paths.map((p) => gh("GET", `/repos/${REPO}/commits?sha=${BRANCH}&per_page=30&path=${encodeURIComponent(p)}`).catch(() => [])));
    const seen = new Map();
    lists.flat().forEach((c) => { if (!isBot(c)) seen.set(c.sha, c); });
    return [...seen.values()].sort((a, b) => new Date(b.commit.committer.date) - new Date(a.commit.committer.date)).slice(0, 30);
  }

  const when = (iso) => new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  function historyPanel(node, hist) {
    const list = h("ol", { class: "history" });
    const panel = h("section", { class: "panel history-panel" }, h("h2", {}, "Cronologia"),
      h("p", { class: "hint" }, "Ogni salvataggio resta in memoria. Scegli una versione per riportare questo elemento (testi, foto, layout) com'era subito dopo quel salvataggio: il resto del sito non cambia, e anche il ripristino si può annullare da qui."),
      h("button", { type: "button", class: "btn small", onclick: async (e) => {
        e.target.disabled = true; e.target.textContent = "Carico le versioni…";
        try {
          const vs = await versions(hist);
          e.target.remove();
          if (!vs.length) { list.replaceWith(h("p", { class: "muted" }, "Nessuna versione precedente.")); return; }
          list.replaceChildren(...vs.map((c, i) => h("li", {},
            h("div", {}, h("strong", {}, when(c.commit.committer.date)), " ", h("span", { class: "muted" }, i === 0 ? "· versione attuale" : ""),
              h("small", {}, c.commit.message.split("\n")[0])),
            i === 0
              ? (c.parents && c.parents.length ? h("button", { type: "button", class: "btn small", title: "Torna a com'era prima di questo salvataggio", onclick: () => restore(node, hist, c.parents[0].sha, "prima del " + when(c.commit.committer.date)) }, "Annulla questo salvataggio") : null)
              // the version = everything up to the next save, so photos the site re-optimised after this save are kept
              : h("button", { type: "button", class: "btn small", onclick: () => restore(node, hist, vs[i - 1].parents[0].sha, when(c.commit.committer.date)) }, "Torna a questa versione"))));
        } catch (err) { e.target.disabled = false; e.target.textContent = "Riprova"; alert("Non riesco a leggere la cronologia: " + why(err)); }
      } }, "Mostra le versioni precedenti"),
      list);
    return panel;
  }

  async function treeAt(sha) {
    const c = await gh("GET", `/repos/${REPO}/git/commits/${sha}`);
    const t = await gh("GET", `/repos/${REPO}/git/trees/${c.tree.sha}?recursive=1`);
    const out = {};
    t.tree.forEach((e) => { if (e.type === "blob") out[e.path] = e.sha; });
    return out;
  }

  async function restore(node, hist, sha, label) {
    if (draft && draft.dirty && !confirm("Hai modifiche non salvate: il ripristino le scarta. Continuare?")) return;
    if (!confirm(`Riporto “${node.title}” alla versione ${label}? Il sito si aggiorna in 1-2 minuti.`)) return;
    const st = $("#save-state");
    if (st) st.textContent = "Ripristino…";
    try {
      const old = await treeAt(sha);
      const blobText = async (s) => b64ToText((await gh("GET", `/repos/${REPO}/git/blobs/${s}`)).content);
      const done = await commit(`Restore ${node.title} to the version of ${label} from admin`, async () => {
        const out = {};
        for (const p of hist.whole) {
          if (old[p] && old[p] !== tree[p]) out[p] = old[p];
          else if (!old[p] && tree[p]) out[p] = null;
        }
        for (const pre of hist.prefixes) {
          Object.keys(old).filter((p) => p.startsWith(pre) && old[p] !== tree[p]).forEach((p) => { out[p] = old[p]; });
          Object.keys(tree).filter((p) => p.startsWith(pre) && !old[p]).forEach((p) => { out[p] = null; });
        }
        const byFile = {};
        hist.fields.forEach((f) => { (byFile[f.file] = byFile[f.file] || []).push(f); });
        for (const [file, fs] of Object.entries(byFile)) {
          if (!old[file] || old[file] === tree[file]) continue;
          const before = await blobText(old[file]);
          let text = await readText(file, true);
          const now = text;
          fs.forEach((f) => { const v = getField(before, f); if (v != null) text = setField(text, f, v); });
          if (text !== now) out[file] = await blobFrom({ text });
        }
        return out;
      });
      if (draft) draft.dirty = false;
      if (!done) { alert("Questa versione è uguale a quella attuale: niente da ripristinare."); if (st) st.textContent = "Nessuna modifica"; return; }
      Object.keys(texts).forEach((k) => delete texts[k]); // read everything again from the restored files
      await applyHome(); await applyPages(); await loadBuilding(); renderNav();
      if (st) st.textContent = "Ripristinato. Il sito si aggiorna in 1-2 minuti…";
      await open(node);
      waitPublished(done, node);
    } catch (e) {
      if (st) st.textContent = "Non ripristinato: " + why(e);
      alert("Ripristino non riuscito: " + why(e));
    }
  }

  // ---------------------------------------------------------------- edit on the preview
  // The preview is the online page, on the same site as /admin, so it can be read: each text of the page that
  // matches a field of the panel is linked to it. A click on a plain paragraph edits it right there (the field
  // follows); a click on formatted text, or on a photo, brings its field or photo into view in the panel.

  const plainMd = (t) => t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|[^\w*])_(.+?)_(?!\w)/g, "$1$2");
  const squash = (t) => t.replace(/\s+/g, " ").trim().toLowerCase();
  const paraSplit = (v) => v.split(/\n\s*\n/);

  function flash(el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  function linkPreview() {
    const frame = $("#preview iframe");
    let doc;
    try { doc = frame.contentDocument; } catch (e) { return; }
    if (!doc || !doc.body || doc.location.href === "about:blank") return;
    doc.querySelectorAll("[data-adm]").forEach((el) => { el.removeAttribute("data-adm"); el.removeAttribute("contenteditable"); });
    // paragraph text -> [input, paragraph index, editable in place]
    const want = new Map();
    $("#main").querySelectorAll("textarea, input[type=text]").forEach((input) => {
      if (input.closest(".savebar") || !input.value.trim()) return;
      paraSplit(input.value).forEach((p, i) => {
        const plain = plainMd(p);
        const key = squash(plain);
        if (key.length < 2) return;
        if (!want.has(key)) want.set(key, []);
        want.get(key).push({ input, i, plainOnly: plain === p && !/\n/.test(p.trim()) });
      });
    });
    const links = new Map();
    let n = 0;
    doc.body.querySelectorAll("h1, h2, h3, p, li, dt, dd, blockquote, figcaption, span, a, div").forEach((el) => {
      if (el.closest("header, footer, [data-adm]") || el.matches("header *, footer *")) return;
      const key = squash(el.textContent);
      const list = want.get(key);
      if (!list || [...el.children].some((c) => squash(c.textContent) === key)) return;
      const hit = list.length > 1 ? list.shift() : list[0]; // same text twice: in page order
      const id = String(++n);
      el.setAttribute("data-adm", id);
      links.set(id, { ...hit, el, editable: hit.plainOnly && !el.querySelector("*:not(br)") });
    });
    if (!doc.getElementById("adm-style")) {
      const st = doc.createElement("style");
      st.id = "adm-style";
      st.textContent = "[data-adm]{cursor:text;border-radius:2px}[data-adm]:hover{outline:2px dashed #2a6df4;outline-offset:3px}" +
        "[data-adm][contenteditable]{outline:2px solid #2a6df4;outline-offset:3px;background:rgba(42,109,244,.06)}" +
        "img.adm-photo{cursor:pointer}img.adm-photo:hover{outline:3px dashed #2a6df4;outline-offset:-3px}";
      doc.head.append(st);
    }
    const adminImgs = [...$("#main").querySelectorAll("img")];
    // compared by site path: the panel may show a photo from GitHub (just saved) and the preview from the site
    const strip = (u) => { const x = u.replace(/[?#].*$/, ""); return (x.match(/(?:^|\/)((?:img|media)\/.+)$/) || [, x])[1]; };
    doc.querySelectorAll("img").forEach((im) => { if (adminImgs.some((a) => strip(a.src) === strip(im.src))) im.classList.add("adm-photo"); });
    doc.__admLinks = links;
    if (doc.__admBound) return;
    doc.__admBound = true;
    doc.addEventListener("click", (e) => {
      const map = doc.__admLinks;
      const im = e.target.closest && e.target.closest("img.adm-photo");
      if (im) {
        const a = [...$("#main").querySelectorAll("img")].find((x) => strip(x.src) === strip(im.src));
        if (a) { e.preventDefault(); e.stopPropagation(); flash(a.closest("li, .cover-slot, .block, figure") || a); }
        return;
      }
      const el = e.target.closest && e.target.closest("[data-adm]");
      const link = el && map.get(el.getAttribute("data-adm"));
      if (!link || !link.input.isConnected) return;
      e.preventDefault(); e.stopPropagation();
      if (!link.editable) { flash(link.input.closest("label, .field, .block, .sheet-row") || link.input); link.input.focus({ preventScroll: true }); return; }
      if (el.isContentEditable) return;
      el.setAttribute("contenteditable", "plaintext-only");
      if (!el.isContentEditable) el.setAttribute("contenteditable", "true");
      el.focus();
      flash(link.input.closest("label, .field, .block, .sheet-row") || link.input);
      if (el.__admEdit) return;
      el.__admEdit = true;
      el.addEventListener("input", () => {
        const link = doc.__admLinks.get(el.getAttribute("data-adm"));
        if (!link) return;
        const text = el.innerText.replace(/\s*\n\s*/g, " ").trim();
        const parts = paraSplit(link.input.value);
        parts[link.i] = (parts[link.i].match(/^\s*/)[0]) + text;
        link.input.value = parts.join("\n\n");
        link.input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      el.addEventListener("keydown", (k) => { if (k.key === "Enter" || k.key === "Escape") { k.preventDefault(); el.blur(); } });
      el.addEventListener("blur", () => el.removeAttribute("contenteditable"));
    }, true);
  }

  // ---------------------------------------------------------------- preview

  function setPreview(page, reload) {
    const frame = $("#preview iframe");
    if (!page) return;
    const url = SITE + page.replace(/#.*/, "") + (reload ? "?t=" + Date.now() : "") + (page.includes("#") ? page.slice(page.indexOf("#")) : "");
    if (reload || frame.dataset.page !== page) { frame.src = url; frame.dataset.page = page; }
    $("#preview a").href = SITE + page;
  }

  // ---------------------------------------------------------------- panel version
  // index.html loads admin.js?v=<first 12 chars of its git blob sha> (written by tools/build_pages.py).
  // If GitHub has a newer admin.js, the browser is showing an old copy of the panel: say so.
  const MY_VERSION = ((document.querySelector('script[src*="admin.js"]') || {}).src || "").split("v=")[1] || "";
  function checkVersion() {
    const online = (tree["admin/admin.js"] || "").slice(0, 12);
    if (!online || online === MY_VERSION || $("#old-version")) return;
    document.body.prepend(h("div", { id: "old-version", class: "old-version" },
      "Stai usando una versione vecchia del pannello. ",
      h("button", { type: "button", onclick: () => { location.href = location.pathname + "?r=" + Date.now() + location.hash; } }, "Aggiorna il pannello"),
      " (prima salva le modifiche aperte)"));
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
    checkVersion();
    await applyHome();
    await applyPages();
    await loadBuilding();
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
  $("#preview iframe").addEventListener("load", () => {
    // the online page can be older than the panel (just saved, or not saved yet): show what the fields say
    try { $("#main").querySelectorAll("[data-live]").forEach((el) => livePreview(el.dataset.live, el.value)); } catch (e) { /* not ready */ }
    try { linkPreview(); } catch (e) { /* preview of another site */ }
  });
  $("#toggle-preview").addEventListener("click", () => document.body.classList.toggle("no-preview"));
  window.addEventListener("beforeunload", (e) => { if (draft && draft.dirty) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("hashchange", () => {
    const n = ALL.find((x) => x.id === location.hash.slice(1));
    if (n && n !== current) open(n);
  });
  start();
})();
