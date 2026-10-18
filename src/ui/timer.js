// Laiko juosta: aiškiai rodo, kiek laiko liko (juosta trumpėja ir keičia spalvą: žalia → geltona → raudona).
// Pabaigą skaičiuoja setTimeout (patikima ir foniniame skirtuke), juostą piešia requestAnimationFrame.
// Paslėpus puslapį laikas sustoja, grįžus – tęsiasi.
import { h } from './dom.js';
import { ICONS } from './icons.js';

export function timerBar() {
  const fill = h('div', { class: 'timer-fill' });
  const el = h('div', { class: 'timer', role: 'timer', 'aria-label': 'Likęs laikas' }, [
    h('span', { class: 'timer-icon', html: ICONS.clock }),
    h('div', { class: 'timer-track' }, fill),
  ]);
  let total = 1;
  let left = 0;
  let running = false;
  let since = 0; // kada paskutinį kartą perskaičiuotas likęs laikas
  let raf = 0;
  let timeout = 0;
  let onEnd = null;

  const sync = () => {
    if (!running) return;
    const now = performance.now();
    left -= (now - since) / 1000;
    since = now;
  };
  const draw = () => {
    const f = Math.max(0, Math.min(1, left / total));
    fill.style.transform = `scaleX(${f})`;
    el.classList.toggle('warn', f <= 0.5 && f > 0.25);
    el.classList.toggle('danger', f <= 0.25);
  };
  const frame = () => {
    sync();
    draw();
    if (running) raf = requestAnimationFrame(frame);
  };
  const finish = () => {
    if (!running) return;
    running = false;
    left = 0;
    cancelAnimationFrame(raf);
    draw();
    onEnd?.();
  };
  const arm = () => {
    clearTimeout(timeout);
    timeout = setTimeout(finish, Math.max(0, left * 1000));
  };

  const api = {
    el,
    /** Paleidžia iš naujo: seconds sekundžių, pasibaigus kviečiamas cb. */
    start(seconds, cb) {
      api.stop();
      total = left = seconds;
      onEnd = cb;
      running = true;
      since = performance.now();
      el.hidden = false;
      draw();
      arm();
      raf = requestAnimationFrame(frame);
    },
    pause() {
      if (!running) return;
      sync();
      running = false;
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
      draw();
      api.paused = true;
    },
    resume() {
      if (!api.paused || left <= 0) return;
      api.paused = false;
      running = true;
      since = performance.now();
      arm();
      raf = requestAnimationFrame(frame);
    },
    /** Sustabdo be pabaigos įvykio (pvz. atsakius). */
    stop() {
      running = false;
      api.paused = false;
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    },
    /** Kiek sekundžių liko. */
    remaining() {
      sync();
      return Math.max(0, left);
    },
    destroy() {
      api.stop();
      document.removeEventListener('visibilitychange', onVis);
    },
    paused: false,
  };
  // Tik pačios juostos sustabdytas laikas (paslėpus puslapį) tęsiasi grįžus – žaidimo pauzės neliečiam.
  let autoPaused = false;
  const onVis = () => {
    if (document.hidden && running) {
      api.pause();
      autoPaused = true;
    } else if (!document.hidden && autoPaused) {
      autoPaused = false;
      api.resume();
    }
  };
  document.addEventListener('visibilitychange', onVis);
  return api;
}
