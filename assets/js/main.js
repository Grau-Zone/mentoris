// mentoris: kleine, abhängigkeitsfreie Interaktionen.
// Ohne JavaScript bleibt jede Seite vollständig lesbar und bedienbar (der Fuß enthält alle Links).
(() => {
  const doc = document.documentElement;
  const desktop = window.matchMedia('(min-width: 900px)');

  /* ---------- Kopfzeile: Haarlinie, sobald gescrollt wurde ---------- */
  const head = document.querySelector('[data-masthead]');
  if (head && 'IntersectionObserver' in window) {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(([entry]) => head.classList.toggle('is-scrolled', !entry.isIntersecting)).observe(sentinel);
  }

  /* ---------- Untermenü „Leistungen“ ---------- */
  const sub = document.querySelector('[data-sub]');
  if (sub) {
    const toggle = sub.querySelector('.nav__toggle');
    let closeTimer;
    const setOpen = (open) => {
      sub.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    sub.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { clearTimeout(closeTimer); setOpen(true); } });
    sub.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') closeTimer = setTimeout(() => setOpen(false), 160); });
    sub.addEventListener('focusout', (e) => { if (!sub.contains(e.relatedTarget)) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sub.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', (e) => { if (!sub.contains(e.target)) setOpen(false); });
  }

  /* ---------- Mobiles Menü ---------- */
  const menuBtn = document.querySelector('[data-menu-btn]');
  const menu = document.querySelector('[data-menu]');
  if (menuBtn && menu) {
    // Bei offenem Menü ist der übrige Inhalt verdeckt: aus der Fokus-Reihenfolge nehmen
    const outside = [...document.querySelectorAll('.skip, main, .colophon')];
    const setMenu = (open, { restoreFocus = true } = {}) => {
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      outside.forEach((el) => { el.inert = open; });
      if (open) menu.querySelector('a')?.focus({ preventScroll: true });
      else if (restoreFocus) menuBtn.focus({ preventScroll: true });
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, { restoreFocus: false }); });
    desktop.addEventListener('change', (m) => { if (m.matches) setMenu(false, { restoreFocus: false }); });
  }

  /* ---------- Leistungsliste: das Bild der aktiven Zeile erscheint im Rahmen rechts ---------- */
  const index = document.querySelector('[data-index]');
  if (index) {
    const rows = [...index.querySelectorAll('.index__row')];
    const place = () => {
      const listH = index.offsetHeight;
      rows.forEach((row) => {
        const fig = row.querySelector('.index__fig');
        const figH = fig ? fig.offsetHeight : 0;
        const want = Math.max(0, Math.min(row.offsetTop, listH - figH));
        row.style.setProperty('--fig-top', `${want - row.offsetTop}px`);
      });
    };
    place();
    window.addEventListener('resize', place, { passive: true });
    document.fonts?.ready.then(place);
    const activate = (row) => rows.forEach((r) => r.classList.toggle('is-active', r === row));
    rows.forEach((row) => {
      row.addEventListener('pointerenter', () => activate(row));
      row.addEventListener('focusin', () => activate(row));
    });
  }

  /* ---------- Inhaltsverzeichnis: aktuellen Abschnitt markieren ---------- */
  const tocLinks = [...document.querySelectorAll('[data-toc] a[href^="#"]')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
      const current = [...byId.keys()].find((id) => visible.has(id));
      tocLinks.forEach((a) => a.removeAttribute('aria-current'));
      if (current) byId.get(current).setAttribute('aria-current', 'true');
    }, { rootMargin: '-20% 0px -55% 0px' });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    tocLinks.forEach((a) => a.addEventListener('click', () => {
      if (!desktop.matches) a.closest('details')?.removeAttribute('open');
    }));
  }
  // Inhaltsverzeichnis: auf breiten Bildschirmen immer offen, schmal eingeklappt (im HTML standardmäßig offen)
  const tocDetails = document.querySelector('[data-toc] details');
  if (tocDetails) {
    const wide = window.matchMedia('(min-width: 1000px)');
    const sync = () => tocDetails.toggleAttribute('open', wide.matches);
    sync();
    wide.addEventListener('change', sync);
  }

  /* ---------- Weiche Einblendungen beim Scrollen, nur wenn Bewegung erwünscht ist ---------- */
  if (doc.classList.contains('motion') && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    document.querySelectorAll('[data-reveal], .colophon__mast, .tide').forEach((el) => io.observe(el));
  }

  /* ---------- Wellen: außerhalb des Bildschirms anhalten (spart Rechenzeit und Akku) ---------- */
  const waveSets = document.querySelectorAll('.waves');
  if (waveSets.length && 'IntersectionObserver' in window) {
    const wio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
    }, { rootMargin: '100px 0px' });
    waveSets.forEach((el) => wio.observe(el));
  }

  /* ---------- Bewegung anhalten / fortsetzen (Wahl bleibt im Browser gespeichert) ---------- */
  const motionToggles = [...document.querySelectorAll('[data-wave-toggle]')];
  const motionOn = () => !doc.classList.contains('motion-off');
  if (motionToggles.length) {
    const KEY = 'mentoris-bewegung';
    const label = () => motionToggles.forEach((b) => {
      b.querySelector('.wave-toggle__label').textContent = motionOn() ? 'Bewegung anhalten' : 'Bewegung fortsetzen';
    });
    label();
    motionToggles.forEach((b) => b.addEventListener('click', () => {
      const off = motionOn();
      if (off) {
        doc.classList.remove('motion');
        doc.classList.add('motion-off');
      } else {
        // Was bereits sichtbar ist, bleibt sichtbar; nichts blendet erneut aus
        document.querySelectorAll('[data-reveal], .colophon__mast, .tide').forEach((el) => el.classList.add('is-in'));
        doc.classList.remove('motion-off');
        doc.classList.add('motion');
      }
      label();
      try { localStorage.setItem(KEY, off ? 'aus' : 'an'); } catch (e) { /* Speicher nicht verfügbar */ }
    }));
  }

  /* ---------- Tropfen im Wasser auf „Termin vereinbaren“ ---------- */
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .call');
    if (!btn || !motionOn()) return;
    const r = btn.getBoundingClientRect();
    const drop = document.createElement('span');
    drop.className = 'ripple';
    drop.setAttribute('aria-hidden', 'true');
    const size = Math.hypot(r.width, r.height) * 2;
    drop.style.cssText = `--x:${e.clientX - r.left}px;--y:${e.clientY - r.top}px;--s:${size}px`;
    btn.append(drop);
    drop.addEventListener('animationend', () => drop.remove(), { once: true });
    setTimeout(() => drop.remove(), 1200);
  });

  /* ---------- Wellen heben sich sanft unter dem Mauszeiger ---------- */
  const heroFrame = document.querySelector('.hero__frame');
  const heroWaves = heroFrame?.querySelectorAll('.waves--hero .wave');
  if (heroFrame && heroWaves?.length && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const H = 260;
    const lines = [...heroWaves].map((svg) => {
      const path = svg.querySelector('path');
      return { svg, path, d0: path.getAttribute('d'), amp: +svg.dataset.amp, period: +svg.dataset.period, phase: +svg.dataset.phase, y0: +svg.dataset.y0, width: +svg.dataset.width };
    });
    const shape = (l, ux, uy, s) => {
      const step = 16;
      let d = '';
      for (let x = 0; x <= l.width + 0.1; x += step) {
        const base = l.y0 + l.amp * Math.sin((x / l.period) * 2 * Math.PI + l.phase);
        const g = Math.exp(-((x - ux) ** 2) / (2 * 150 * 150));   // Breite der Welle unter dem Zeiger
        const near = Math.exp(-((base - uy) ** 2) / (2 * 90 * 90)); // nahe Linien reagieren stärker
        const y = base - s * 50 * g * (0.3 + 0.7 * near);
        d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d;
    };
    let px = 0, py = 0, strength = 0, target = 0, raf = 0;
    const frame = () => {
      strength += (target - strength) * 0.07;
      if (target === 0 && strength < 0.004) {
        lines.forEach((l) => l.path.setAttribute('d', l.d0));
        strength = 0;
        raf = 0;
        return;
      }
      lines.forEach((l) => {
        const r = l.svg.getBoundingClientRect();
        const ux = ((px - r.left) / r.width) * l.width;
        const uy = ((py - r.top) / r.height) * H;
        l.path.setAttribute('d', shape(l, ux, uy, strength));
      });
      raf = requestAnimationFrame(frame);
    };
    heroFrame.addEventListener('pointermove', (e) => {
      if (!motionOn()) return;
      px = e.clientX;
      py = e.clientY;
      target = 1;
      if (!raf) raf = requestAnimationFrame(frame);
    });
    heroFrame.addEventListener('pointerleave', () => { target = 0; });
  }

  /* ---------- Druck: FAQ-Antworten aufklappen ---------- */
  window.addEventListener('beforeprint', () => document.querySelectorAll('.faq details:not([open])').forEach((d) => {
    d.open = true;
    d.dataset.printOpened = '';
  }));
  window.addEventListener('afterprint', () => document.querySelectorAll('details[data-print-opened]').forEach((d) => {
    d.open = false;
    delete d.dataset.printOpened;
  }));

  doc.classList.add('js-ready');
})();
