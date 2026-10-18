// Vizualūs efektai: dalelių pliūpsniai, krentantys lapeliai, pasirodymo animacijos.
// Visur gerbiamas prefers-reduced-motion. Animuojama per GSAP.
import { gsap } from 'gsap';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let layer = null;
function fxLayer() {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
  }
  return layer;
}

const STAR = `<svg viewBox="0 0 24 24"><path d="M12 2.8l2.75 5.6 6.15.9-4.45 4.35 1.05 6.12L12 16.87l-5.5 2.9 1.05-6.12L3.1 9.3l6.15-.9z" fill="#FFC531" stroke="#E0A100" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const leaf = (fill, stroke) =>
  `<svg viewBox="0 0 24 24"><path d="M12 2C6 7 5 15 12 22c7-7 6-15 0-20z" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/><path d="M12 6v14" stroke="${stroke}" stroke-width="1.2"/></svg>`;
const LEAVES = [leaf('#4CB963', '#2E9A48'), leaf('#FFC531', '#E0A100'), leaf('#FF7A68', '#E5533D'), leaf('#9BE0A6', '#2E9A48')];
const DOT = (c) => `<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="${c}"/></svg>`;

const rand = (a, b) => a + Math.random() * (b - a);

function particle(html, size, x, y) {
  const p = document.createElement('div');
  p.className = 'fx-p';
  p.innerHTML = html;
  p.style.width = p.style.height = `${size}px`;
  p.style.left = `${x - size / 2}px`;
  p.style.top = `${y - size / 2}px`;
  fxLayer().append(p);
  return p;
}

/** Išvalo visas daleles (keičiant ekraną – kad lapeliai nekristų per naują ekraną). */
export function clearFx() {
  if (!layer) return;
  gsap.killTweensOf(layer.children);
  layer.replaceChildren();
}

/** Žvaigždučių ir taškelių pliūpsnis iš elemento centro. */
export function burst(el, { count = 10, kind = 'star', spread = 110 } = {}) {
  if (reduced() || !el?.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < count; i++) {
    const big = i % 3 === 0;
    const html = kind === 'leaf' ? LEAVES[i % LEAVES.length] : big ? STAR : DOT(['#FFC531', '#4CB963', '#3FA9F5', '#FF7A68'][i % 4]);
    const size = big ? rand(18, 26) : rand(8, 12);
    const p = particle(html, size, cx, cy);
    const a = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
    const d = rand(spread * 0.5, spread);
    gsap
      .timeline({ onComplete: () => p.remove() })
      .fromTo(p, { x: 0, y: 0, scale: 0.3, rotation: 0 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 1, rotation: rand(-90, 90), duration: rand(0.4, 0.55), ease: 'power3.out' })
      .to(p, { y: `+=${rand(25, 45)}`, autoAlpha: 0, rotation: `+=${rand(-60, 60)}`, duration: 0.35, ease: 'power1.in' });
  }
}

/** Krentantys lapeliai ir žvaigždutės per visą ekraną (rezultatui). */
export function celebrate({ count = 28, duration = 2600 } = {}) {
  if (reduced()) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const html = i % 4 === 0 ? STAR : LEAVES[i % LEAVES.length];
    const size = rand(16, 28);
    const x = rand(0, w);
    const p = particle(html, size, x, -30);
    const drift = rand(-80, 80);
    const dur = rand(duration * 0.7, duration * 1.2) / 1000;
    gsap.set(p, { autoAlpha: 0 });
    gsap
      .timeline({ delay: rand(0, 0.9), onComplete: () => p.remove() })
      .to(p, { autoAlpha: 1, duration: 0.2 })
      .to(p, { y: h + 60, rotation: rand(200, 420), duration: dur, ease: 'none' }, 0)
      // lapelis lengvai sūpuojasi į šonus krisdamas
      .to(p, { x: drift, duration: dur / 3, ease: 'sine.inOut', yoyo: true, repeat: 2 }, 0);
  }
}

/** Žvaigždutė, "nuskrendanti" iš vieno elemento į kitą. */
export function flyStar(fromEl, toEl, delay = 0) {
  if (reduced() || !fromEl || !toEl) return Promise.resolve();
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const p = particle(STAR, 30, a.left + a.width / 2, a.top + a.height / 2);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  return new Promise((r) =>
    gsap.to(p, {
      keyframes: { x: [0, dx * 0.5, dx], y: [0, dy * 0.5 - 60, dy], scale: [1, 1.3, 0.6] },
      duration: 0.7,
      delay: delay / 1000,
      ease: 'power2.inOut',
      onComplete: () => (p.remove(), r()),
    })
  );
}

export { stagger } from './motion.js';

/** Skaičiaus "suskaičiavimas" nuo a iki b. */
export function countUp(el, from, to, { duration = 900, maxSteps = 20, onStep } = {}) {
  if (reduced() || to <= from) {
    el.textContent = to;
    return;
  }
  const steps = Math.min(to - from, maxSteps);
  let i = 0;
  const tick = () => {
    i++;
    const v = Math.round(from + ((to - from) * i) / steps);
    el.textContent = v;
    onStep?.(i);
    if (i < steps) setTimeout(tick, duration / steps);
  };
  setTimeout(tick, 250);
}
