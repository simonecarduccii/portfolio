// Header: becomes solid after scrolling past the hero.
(function () {
  var header = document.querySelector('.site-header.on-hero');
  if (!header) return;
  var onScroll = function () {
    header.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.6);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Random photo from the archive (list in assets/archivio.js).
(function () {
  var photos = (window.ARCHIVIO || []).filter(function (p) { return p && p.src; });
  var targets = document.querySelectorAll('[data-random-photo]');
  if (!photos.length || !targets.length) return;

  var last = -1;
  function pick() {
    if (photos.length === 1) return 0;
    var i;
    do { i = Math.floor(Math.random() * photos.length); } while (i === last);
    last = i;
    return i;
  }

  function show(target) {
    var photo = photos[pick()];
    var media = target.querySelector('.media') || target;
    var img = media.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      media.appendChild(img);
    }
    img.classList.remove('fade');
    void img.offsetWidth;
    img.src = (target.getAttribute('data-base') || '') + photo.src;
    img.alt = photo.alt || 'Fotografia analogica di Simone Carducci';
    img.classList.add('fade');
    var info = document.querySelector('[data-photo-info]');
    if (info) {
      info.textContent = [photo.title, photo.camera, photo.film, photo.year].filter(Boolean).join(' · ') || '';
    }
  }

  targets.forEach(function (t) {
    show(t);
    if (t.hasAttribute('data-click-next')) {
      t.addEventListener('click', function () { show(t); });
    }
  });

  var btn = document.querySelector('[data-next-photo]');
  if (btn) btn.addEventListener('click', function () { targets.forEach(show); });

  document.addEventListener('keydown', function (e) {
    if (btn && (e.key === ' ' || e.key === 'ArrowRight') && document.activeElement === document.body) {
      e.preventDefault();
      targets.forEach(show);
    }
  });
})();
