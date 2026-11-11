// Pelėda Ona su „6–7“ judesiu: jei žaidime per trumpą laiką padaroma daug klaidų,
// apačioje trumpam (≈2,5 s) iššoka Ona, sūpuoja sparnus aukštyn-žemyn, o virš jų iššoka „6“ ir „7“.
// Netrukdo žaisti (nepaspaudžiama), pasirodo ne dažniau kaip kas 2 min. Kadrai – Magnific (Freepik) iliustracija
// ir jos veidrodinis atspindys (public/assets/characters/ona67/).
import { h } from './dom.js';
import { onSfx, sfx } from '../sfx.js';

const IMG = `${import.meta.env.BASE_URL}assets/characters/ona67/`;
const WINDOW_MS = 30_000; // per kiek laiko skaičiuojamos klaidos
const MISTAKES = 4; // kiek klaidų – ir pasirodo Ona
const COOLDOWN_MS = 120_000;
const BEATS = 8; // sparnų mostų skaičius
const BEAT_MS = 300;

let recent = [];
let lastShown = -Infinity;
let showing = false;

function inGame() {
  return !!document.querySelector('.screen.game');
}

function show() {
  showing = true;
  lastShown = Date.now();
  const el = h('div', { class: 'oops67', 'aria-hidden': 'true' }, [
    h('img', { class: 'oops67-a', src: `${IMG}a.webp`, alt: '', draggable: 'false' }),
    h('img', { class: 'oops67-b', src: `${IMG}b.webp`, alt: '', draggable: 'false' }),
    h('span', { class: 'oops67-n six', text: '6' }),
    h('span', { class: 'oops67-n seven', text: '7' }),
  ]);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  let beat = 0;
  const timer = setInterval(() => {
    el.classList.toggle('flip', beat % 2 === 1);
    el.dataset.beat = String(beat % 2);
    sfx('doot', beat);
    if (++beat >= BEATS) {
      clearInterval(timer);
      el.classList.remove('in');
      setTimeout(() => {
        el.remove();
        showing = false;
      }, 450);
    }
  }, BEAT_MS);
}

/** Įjungiama vieną kartą (main.js): klausosi klaidų garso visuose žaidimuose. */
export function setupOops67() {
  // iš anksto užkraunam kadrus, kad pasirodžius nemirgėtų
  ['a', 'b'].forEach((f) => {
    const img = new Image();
    img.src = `${IMG}${f}.webp`;
  });
  onSfx((name) => {
    const now = Date.now();
    if (name === 'correct') {
      recent = []; // pavyko – skaičiuojam iš naujo
      return;
    }
    if (name !== 'wrong' || !inGame()) return;
    recent = recent.filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    if (recent.length >= MISTAKES && !showing && now - lastShown > COOLDOWN_MS) {
      recent = [];
      setTimeout(show, 450); // po klaidos garso
    }
  });
}
