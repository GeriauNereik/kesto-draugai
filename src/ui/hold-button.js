import { h } from './dom.js';
import { ICONS } from './icons.js';

/**
 * Mygtukas, kuris suveikia tik palaikius `ms` milisekundžių (apsauga nuo vaikų).
 * Trumpai paspaudus parodoma užuomina tėvams.
 */
export function holdButton({ icon, ariaLabel, hint, ms = 2000, onHold }) {
  const R = 29;
  const C = 2 * Math.PI * R;
  const ring = `<svg class="hold-ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${R}" style="stroke-dasharray:${C};stroke-dashoffset:${C}"/></svg>`;
  const tip = h('span', { class: 'hold-tip', text: hint, hidden: true });
  const btn = h('button', { type: 'button', class: 'icon-btn hold-btn', 'aria-label': ariaLabel, html: ring + ICONS[icon] });
  btn.style.setProperty('--hold-ms', `${ms}ms`);
  const el = h('div', { class: 'hold-wrap' }, [btn, tip]);

  let timer = null;
  let tipTimer = null;
  let fired = false;

  const showTip = () => {
    tip.hidden = false;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => (tip.hidden = true), 2500);
  };
  const cancel = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    btn.classList.remove('holding');
    if (!fired) showTip();
  };

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    fired = false;
    tip.hidden = true;
    btn.classList.add('holding');
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      btn.classList.remove('holding');
      onHold();
    }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, cancel));
  // Klaviatūra (tėvams su klaviatūra / VoiceOver): Enter atidaro iškart po vartų klausimo.
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onHold();
    }
  });
  return el;
}
