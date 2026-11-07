// Simone Carducci — portfolio. Small, dependency-free interactions.

// Header: transparent over the home hero, solid after 40px of scroll.
(function () {
  var header = document.querySelector('.site-header.on-hero');
  if (!header) return;
  var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Mobile menu.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = header && header.querySelector('.nav-toggle');
  if (!toggle) return;
  function set(open) {
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Chiudi' : 'Menu';
  }
  toggle.addEventListener('click', function () { set(!header.classList.contains('menu-open')); });
  header.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 760) set(false); });
})();

// Random photo from the archive. The list is img/archivio/archivio.json, written by
// tools/optimize_images.py: [{"n":"0001","file":"0001.jpg","film":"...","luogo":"...","anno":2024}].
// Each click shows a different photo; the next one is preloaded so it appears at once.
// (fetch needs a web server: preview locally with `python3 -m http.server`.)
(function () {
  var targets = document.querySelectorAll('[data-random-photo]');
  if (!targets.length || !window.fetch) return;
  fetch('img/archivio/archivio.json')
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      start((Array.isArray(list) ? list : []).filter(function (p) { return p && p.file; }).map(function (p) {
        return {
          n: p.n, src: 'img/archivio/' + p.file, thumb: 'img/archivio/thumbs/' + p.file,
          film: p.film, place: p.luogo, year: p.anno,
          alt: 'Fotografia analogica di Simone Carducci' + (p.luogo ? ', ' + p.luogo : '') + (p.anno ? ', ' + p.anno : '')
        };
      }));
    })
    .catch(function () {});

  function start(photos) {
  if (!photos.length) return;

  var last = -1;
  var queued = null;
  function randomIndex() {
    if (photos.length === 1) return 0;
    var i;
    do { i = Math.floor(Math.random() * photos.length); } while (i === last);
    return i;
  }
  function pick(forced) {
    var i = forced !== undefined ? forced : (queued !== null ? queued : randomIndex());
    last = i;
    queued = randomIndex();
    new Image().src = photos[queued].src;
    return i;
  }

  function show(target, forced) {
    var i = pick(forced);
    var photo = photos[i];
    var media = target.classList.contains('media') ? target : (target.querySelector('.media') || target);
    var img = media.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      media.appendChild(img);
    }
    img.classList.remove('fade');
    void img.offsetWidth;
    img.src = photo.src;
    img.alt = photo.alt || 'Fotografia analogica di Simone Carducci';
    img.classList.add('fade');
    media.classList.add('has-photo');
    var info = document.querySelector('[data-photo-info]');
    if (info) {
      var n = 'N. ' + (photo.n || String(i + 1).padStart(4, '0'));
      info.textContent = [n, photo.film, [photo.place, photo.year].filter(Boolean).join(', ')]
        .filter(Boolean).join(' — ');
    }
  }

  targets.forEach(function (t) {
    show(t);
    if (!t.hasAttribute('data-click-next')) return;
    t.setAttribute('role', 'button');
    t.setAttribute('tabindex', '0');
    t.setAttribute('aria-label', "Mostra un'altra foto");
    t.addEventListener('click', function () { show(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(t); }
    });
    var startX = null;
    t.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    t.addEventListener('touchend', function (e) {
      if (startX !== null && Math.abs(e.changedTouches[0].clientX - startX) > 40) show(t);
      startX = null;
    });
  });

  var stage = document.querySelector('.archive-stage');
  var btn = document.querySelector('[data-next-photo]');
  if (btn && stage) btn.addEventListener('click', function () { show(stage); });

  document.addEventListener('keydown', function (e) {
    if (stage && (e.key === ' ' || e.key === 'ArrowRight') && document.activeElement === document.body) {
      e.preventDefault();
      show(stage);
    }
  });

  // Contact sheet under the archive: every photo as a thumbnail, click to project it.
  var sheet = document.querySelector('[data-contact-sheet]');
  if (sheet && stage) {
    photos.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Mostra la foto ' + (i + 1));
      b.innerHTML = '<img loading="lazy" alt="">';
      b.firstChild.src = p.thumb;
      b.firstChild.onerror = function () { this.onerror = null; this.src = p.src; };
      b.addEventListener('click', function () {
        show(stage, i);
        stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      sheet.appendChild(b);
    });
  }
  }
})();

// Home hero: hovering a project title shows its cover behind the list.
(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var links = hero.querySelectorAll('.hero-list a[data-cover]');
  var layers = {};
  links.forEach(function (a) {
    var src = a.getAttribute('data-cover');
    var probe = new Image();
    probe.onload = function () {
      var img = document.createElement('img');
      img.className = 'hero-cover';
      img.alt = '';
      img.src = src;
      hero.insertBefore(img, hero.querySelector('.hero-tag'));
      layers[src] = img;
    };
    probe.src = src;
    var on = function () { if (layers[src]) layers[src].classList.add('on'); };
    var off = function () { if (layers[src]) layers[src].classList.remove('on'); };
    a.addEventListener('mouseenter', on);
    a.addEventListener('focus', on);
    a.addEventListener('mouseleave', off);
    a.addEventListener('blur', off);
  });
})();

// Photo sequences: once some photos exist, hide the empty slots and renumber.
(function () {
  document.querySelectorAll('.photo-seq').forEach(function (seq) {
    var items = Array.prototype.slice.call(seq.querySelectorAll('li[data-src]'));
    var pending = items.length;
    var sizes = [];
    items.forEach(function (li, i) {
      var probe = new Image();
      probe.onload = function () { sizes[i] = [probe.naturalWidth, probe.naturalHeight]; settle(); };
      probe.onerror = settle;
      probe.src = li.getAttribute('data-src');
    });
    function settle() {
      if (--pending) return;
      var filled = items.filter(function (li, i) { return sizes[i]; });
      if (!filled.length) return; // nothing uploaded yet: keep the placeholders
      var total = String(filled.length).padStart(2, '0');
      items.forEach(function (li, i) {
        if (!sizes[i]) { li.remove(); return; }
        if (sizes[i][1] > sizes[i][0]) li.classList.add('portrait');
        var c = li.querySelector('.count');
        if (c) c.textContent = String(filled.indexOf(li) + 1).padStart(2, '0') + '/' + total;
      });
    }
  });
})();

// AI index: whole row is clickable; on desktop a thumbnail follows the cursor.
(function () {
  var rows = document.querySelectorAll('.index-table tr.row-link');
  if (!rows.length) return;
  var thumb = document.createElement('div');
  thumb.className = 'row-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  thumb.innerHTML = '<img alt="">';
  document.body.appendChild(thumb);
  var timg = thumb.firstChild;
  rows.forEach(function (tr) {
    var link = tr.querySelector('a');
    tr.addEventListener('click', function (e) { if (link && e.target.tagName !== 'A') link.click(); });
    var src = tr.getAttribute('data-thumb');
    if (!src) return;
    var ok = false;
    var probe = new Image();
    probe.onload = function () { ok = true; };
    probe.src = src;
    tr.addEventListener('mouseenter', function () { if (ok) { timg.src = src; thumb.classList.add('on'); } });
    tr.addEventListener('mouseleave', function () { thumb.classList.remove('on'); });
    tr.addEventListener('mousemove', function (e) {
      thumb.style.left = (e.clientX + 24) + 'px';
      thumb.style.top = (e.clientY - 90) + 'px';
    });
  });
})();

// Gallery lightbox: click a project photo to see it full screen.
(function () {
  var galleries = document.querySelectorAll('.gallery');
  if (!galleries.length || !window.HTMLDialogElement) return;

  var box = document.createElement('dialog');
  box.className = 'lightbox';
  box.setAttribute('aria-label', 'Foto a schermo intero');
  box.innerHTML = '<img alt=""><button class="lb-prev" type="button" aria-label="Foto precedente">←</button>' +
    '<button class="lb-next" type="button" aria-label="Foto successiva">→</button>' +
    '<button class="lb-close" type="button">Chiudi ✕</button><span class="lb-count label"></span>';
  document.body.appendChild(box);
  var big = box.querySelector('img');
  var count = box.querySelector('.lb-count');
  var list = [];
  var index = 0;

  function show(i) {
    index = (i + list.length) % list.length;
    big.src = list[index].currentSrc || list[index].src;
    big.alt = list[index].alt;
    count.textContent = (index + 1) + ' / ' + list.length;
    box.querySelector('.lb-prev').hidden = box.querySelector('.lb-next').hidden = list.length < 2;
  }

  galleries.forEach(function (g) {
    g.addEventListener('click', function (e) {
      var img = e.target.closest('img');
      if (!img) return;
      list = Array.prototype.slice.call(g.querySelectorAll('img'));
      show(list.indexOf(img));
      box.showModal();
      document.body.classList.add('no-scroll');
    });
  });

  box.addEventListener('close', function () { document.body.classList.remove('no-scroll'); });
  box.querySelector('.lb-close').addEventListener('click', function () { box.close(); });
  box.querySelector('.lb-prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lb-next').addEventListener('click', function () { show(index + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  var startX = null;
  box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();
