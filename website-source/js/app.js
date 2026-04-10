/* ── Nav scroll effect ─────────────────────── */
const nav = document.getElementById('nav')
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 10)
}, { passive: true })

/* ── Mobile nav toggle ─────────────────────── */
const navToggle = document.getElementById('navToggle')
const navLinks  = document.querySelector('.nav-links')
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open')
})
// Close on link click
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'))
})

/* ── Scroll-in animations ──────────────────── */
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible')
        observer.unobserve(e.target)
      }
    })
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
)

const animTargets = [
  '.feature-card',
  '.screenshot-card',
  '.tech-item',
  '.doc-card',
  '.download-card',
  '.widget-pill',
  '.hero-badge',
  '.hero-title',
  '.hero-sub',
  '.hero-actions',
  '.hero-stats',
  '.section-header',
]

document.querySelectorAll(animTargets.join(',')).forEach((el, i) => {
  el.classList.add('fade-in')
  // Stagger siblings slightly
  el.style.transitionDelay = `${(i % 8) * 0.05}s`
  observer.observe(el)
})
