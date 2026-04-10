/* ================================================================
   docs.js  —  XStat documentation page interactions
   - Scroll-spy: highlights active sidebar link as you scroll
   - Mobile sidebar toggle
   - Copy-to-clipboard buttons
   - Sidebar search / filter
   ================================================================ */

(function () {
  'use strict';

  /* ── Scroll-spy ─────────────────────────────────────────────── */
  const links = /** @type {NodeListOf<HTMLAnchorElement>} */
    (document.querySelectorAll('.docs-nav-link'));

  const sectionIds = Array.from(links).map(l => l.getAttribute('href')?.replace('#', '')).filter(Boolean);

  const sections = sectionIds.map(id => document.getElementById(id || '')).filter(Boolean);

  let activeId = '';

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    links.forEach(l => {
      const href = l.getAttribute('href');
      if (href === '#' + id) {
        l.classList.add('active');
        // Scroll the sidebar link into view if needed
        const sidebar = document.getElementById('docsSidebar');
        if (sidebar) {
          const linkRect = l.getBoundingClientRect();
          const sidebarRect = sidebar.getBoundingClientRect();
          if (linkRect.bottom > sidebarRect.bottom || linkRect.top < sidebarRect.top) {
            l.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      } else {
        l.classList.remove('active');
      }
    });
  }

  // IntersectionObserver approach — marks the topmost visible section
  const observerMap = new Map();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(e => {
        observerMap.set(e.target.id, e.intersectionRatio);
      });

      // Pick the section with the highest ratio that is near the top
      let bestId = '';
      let bestRatio = 0;

      sections.forEach(sec => {
        if (!sec) return;
        const ratio = observerMap.get(sec.id) || 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = sec.id;
        }
      });

      if (bestId) setActive(bestId);
    },
    {
      rootMargin: '-80px 0px -60% 0px',
      threshold: [0, 0.1, 0.5, 1],
    }
  );

  sections.forEach(s => s && observer.observe(s));

  // Fallback scroll listener for environments where IntersectionObserver
  // misses the topmost section (e.g. when content is shorter than viewport)
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;

      const scrollY = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        if (!sec) continue;
        if (sec.offsetTop <= scrollY) {
          setActive(sec.id);
          return;
        }
      }

      // At the very top — activate first section
      if (sections[0]) setActive(sections[0].id);
    });
  }, { passive: true });

  // Activate first section on load
  if (sections[0]) setActive(sections[0].id);

  /* ── Smooth scroll on sidebar click ──────────────────────────── */
  const nav = document.getElementById('docsNav');
  if (nav) {
    nav.addEventListener('click', e => {
      const target = /** @type {HTMLElement} */ (e.target);
      const link = target.closest('.docs-nav-link');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;

      const sectionEl = document.querySelector(href);
      if (!sectionEl) return;

      e.preventDefault();
      sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Close sidebar on mobile after navigation
      sidebar.classList.remove('open');
    });
  }

  /* ── Mobile sidebar toggle ────────────────────────────────────── */
  const sidebar = document.getElementById('docsSidebar');
  const toggle = document.getElementById('sidebarToggle');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    // Close if user clicks outside
    document.addEventListener('click', e => {
      if (
        sidebar.classList.contains('open') &&
        !sidebar.contains(/** @type {Node} */ (e.target)) &&
        !toggle.contains(/** @type {Node} */ (e.target))
      ) {
        sidebar.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Copy-to-clipboard buttons ───────────────────────────────── */
  document.addEventListener('click', e => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('.doc-copy-btn');
    if (!btn) return;

    const text = btn.getAttribute('data-copy');
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) { /* noop */ }
      document.body.removeChild(ta);
    });
  });

  /* ── Sidebar search / filter ─────────────────────────────────── */
  const searchInput = document.getElementById('docsSearch');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();

      if (!query) {
        // Show everything
        links.forEach(l => l.classList.remove('hidden'));
        document.querySelectorAll('.docs-nav-group').forEach(g => g.classList.remove('hidden-group'));
        return;
      }

      document.querySelectorAll('.docs-nav-group').forEach(group => {
        const groupLinks = group.querySelectorAll('.docs-nav-link');
        let anyVisible = false;

        groupLinks.forEach(link => {
          const text = link.textContent?.toLowerCase() || '';
          if (text.includes(query)) {
            link.classList.remove('hidden');
            anyVisible = true;
          } else {
            link.classList.add('hidden');
          }
        });

        if (anyVisible) {
          group.classList.remove('hidden-group');
        } else {
          group.classList.add('hidden-group');
        }
      });
    });

    // Clear on Escape
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.blur();
      }
    });
  }

})();
