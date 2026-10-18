import { h, pulse } from './dom.js';

export function progress(total) {
  const fill = h('div', { class: 'progress-fill' }, h('span', { class: 'progress-knob' }));
  let last = 0;
  const label = h('span', { class: 'progress-label' });
  const el = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total }, [
    h('div', { class: 'progress-track' }, fill),
    label,
  ]);
  const set = (done) => {
    const d = Math.min(done, total);
    fill.style.width = `${(d / total) * 100}%`;
    label.textContent = `${d}/${total}`;
    el.setAttribute('aria-valuenow', d);
    if (d > last) pulse(el, 'progress-bump');
    last = d;
  };
  set(0);
  return { el, set };
}
