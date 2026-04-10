/* ════════════════════════════════════════════════
   XStat Website — JS
   ════════════════════════════════════════════════ */

// ── Nav: scrolled class ────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ── Nav: mobile burger ─────────────────────────
const navBurger = document.getElementById('navBurger');
const navLinks  = document.getElementById('navLinks');
if (navBurger && navLinks) {
  navBurger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navBurger.classList.toggle('open', open);
    navBurger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navBurger.classList.remove('open');
      navBurger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

// ── Reveal on scroll ──────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const siblings = entry.target.parentElement
        ? Array.from(entry.target.parentElement.querySelectorAll('[data-reveal]'))
        : [];
      const idx = siblings.indexOf(entry.target);
      const delay = Math.min(idx * 60, 300);
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

// ── Showcase tabs ─────────────────────────────
const tabsEl = document.querySelector('[data-tabs]');
if (tabsEl) {
  const btns   = tabsEl.querySelectorAll('.tab-btn');
  const panels = tabsEl.querySelectorAll('.tab-panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.tab;
      btns.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === idx);
        b.setAttribute('aria-selected', String(b.dataset.tab === idx));
      });
      panels.forEach(p => {
        p.classList.toggle('active', p.dataset.panel === idx);
      });
    });
  });
}

// ── Live clock widget preview ─────────────────
function updateClock() {
  const el = document.querySelector('.wp-clock-time');
  if (!el) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  el.textContent = h + ':' + m;
}
updateClock();
setInterval(updateClock, 10000);

// ── Bar widget animated demo ──────────────────
(function animateBar() {
  const fill  = document.querySelector('.wp-fill');
  const valEl = document.querySelector('.wp-val-sm');
  if (!fill) return;

  let target  = 35;
  let current = 35;

  setInterval(() => {
    target = Math.max(5, Math.min(95, target + (Math.random() - 0.48) * 18));
  }, 2000);

  function step() {
    current += (target - current) * 0.06;
    const pct = Math.round(current);
    fill.style.width = pct + '%';
    if (valEl) valEl.textContent = pct + ' %';
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}());
