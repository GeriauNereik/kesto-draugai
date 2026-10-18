// Užrakto ekranas: admin uždėjo kodą (ir galbūt žinutę). Žaisti galima tik suvedus kodą.
// Rodomas virš visko; atsiranda ir dingsta pats, kai pasikeičia užrakto būsena.
import { h } from '../ui/dom.js';
import { ICONS } from '../ui/icons.js';
import { activeLock, tryUnlock, onLockChange } from '../sync/activity.js';
import { stop } from '../audio.js';
import { sfx } from '../sfx.js';

let overlay = null;

function render(lock) {
  let typed = '';
  const dots = h('div', { class: 'lock-dots', 'aria-live': 'polite' });
  const card = h('div', { class: 'lock-card' });
  const paint = () => {
    const n = String(lock.code).length;
    dots.replaceChildren(...Array.from({ length: n }, (_, i) => h('span', { class: `lock-dot${i < typed.length ? ' on' : ''}` })));
  };
  const submit = () => {
    if (tryUnlock(typed)) {
      sfx('correct');
      return;
    }
    sfx('wrong');
    card.classList.remove('shake');
    void card.offsetWidth; // iš naujo paleidžiam animaciją
    card.classList.add('shake');
    typed = '';
    paint();
  };
  const key = (label, fn, cls = '') => {
    const b = h('button', { type: 'button', class: `lock-key ${cls}`, 'aria-label': label }, label.length > 1 ? h('span', { html: ICONS.back }) : label);
    // Ne onTap: jis praleidžia greitai pakartotus paspaudimus, o kode skaitmenys gali kartotis (1122).
    b.addEventListener('click', () => (sfx('tap'), fn()));
    return b;
  };
  const digit = (d) =>
    key(String(d), () => {
      if (typed.length >= 8) return;
      typed += d;
      paint();
      if (typed.length === String(lock.code).length) setTimeout(submit, 150);
    });
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit);
  keys.push(h('span'), digit(0), key('Ištrinti', () => ((typed = typed.slice(0, -1)), paint()), 'lock-del'));

  card.append(
    h('div', { class: 'lock-icon', html: ICONS.lock }),
    lock.msg ? h('p', { class: 'lock-msg', text: lock.msg }) : h('p', { class: 'lock-msg', text: 'Įvesk kodą' }),
    dots,
    h('div', { class: 'lock-pad' }, keys)
  );
  paint();
  return h('div', { class: 'lock-screen', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Užrakinta' }, card);
}

function sync(lock) {
  const sig = lock ? `${lock.key}:${lock.at}` : '';
  if (overlay?.dataset.sig === sig) return;
  overlay?.remove();
  overlay = null;
  if (!lock) return;
  stop();
  overlay = render(lock);
  overlay.dataset.sig = sig;
  document.body.append(overlay);
}

/** Paleidžiama vieną kartą: stebi užrakto būseną ir rodo / paslepia ekraną. */
export function watchLock() {
  onLockChange(sync);
  sync(activeLock());
}
