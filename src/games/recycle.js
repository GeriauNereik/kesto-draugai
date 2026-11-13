// Gedas: „Rūšiuok šiukšles“ – konvejeriu važiuoja pakuotės su pavadinimais, jas reikia nukreipti į tinkamą
// konteinerį: žalias – stiklas, mėlynas – popierius ir kartonas, geltonas – plastikas ir metalas.
// Kaip nukreipti:
//  • bakstelėti konteinerį – į jį keliauja toliausiai nuvažiavęs daiktas (arba pažymėtas);
//  • bakstelėti daiktą (pažymimas), tada konteinerį;
//  • nutempti daiktą pirštu į konteinerį.
// Klaida ar nespėtas išrūšiuoti daiktas (nukrenta juostos gale, net jei laikomas pirštu) – minus širdelė (Gedas pasako, kur jis turėjo keliauti).
// Kuo aukštesnis lygis, tuo daugiau daiktų ir tuo greičiau važiuoja juosta (src/config/recycle.js).
import { h, onTap, shuffle, wait, pulse } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, intro } from './common.js';
import { addHearts } from '../ui/hearts.js';
import { onDrag } from '../ui/drag.js';
import { sfx } from '../sfx.js';
import { burst } from '../ui/fx.js';
import { BINS, BIN_ORDER, RECYCLE_ITEMS, RECYCLE_LEVELS, RECYCLE_LIVES } from '../config/recycle.js';

const IMG = `${import.meta.env.BASE_URL}assets/recycle/items/`;
const EXAMPLE = { glass: 'zalias-butelis', paper: 'laikrastis', yellow: 'plastikinis-butelis' };
const DRAG_PX = 8;
const PAUSE_AFTER_MISS = 1500; // po klaidos juosta trumpam sustoja – kad spėtų perskaityti / išgirsti

const BIN_SVG = `<svg class="rc-bin-shape" viewBox="0 0 100 92" aria-hidden="true">
  <rect x="6" y="6" width="88" height="15" rx="6" fill="currentColor" stroke="#5a3825" stroke-width="3"/>
  <rect x="38" y="1.5" width="24" height="8" rx="4" fill="currentColor" stroke="#5a3825" stroke-width="3"/>
  <path d="M12 24h76l-6 60a6 6 0 0 1-6 5.5H24a6 6 0 0 1-6-5.5z" fill="currentColor" stroke="#5a3825" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 34v42M50 34v42M70 34v42" stroke="rgba(0,0,0,.12)" stroke-width="5" stroke-linecap="round"/>
</svg>`;

export function recycleGame(root, { level, onHome, onFinish }) {
  const L = RECYCLE_LEVELS[level - 1] || RECYCLE_LEVELS[0];
  const queue = shuffle(RECYCLE_ITEMS.slice()).slice(0, L.count);
  queue.forEach(([id]) => (new Image().src = `${IMG}${id}.webp`)); // iš anksto, kad nemirgėtų

  let lives = RECYCLE_LIVES;
  let spawned = 0;
  let resolved = 0;
  let sinceSpawn = 0;
  let pausedUntil = 0;
  let selected = null;
  let running = false;
  let raf = 0;
  let last = 0;
  let over = false;
  const live = []; // daiktai ant juostos: { el, data, x, w, drag }

  const say = () => shell.char.speak('phrases/rusiuok_intro');
  const shell = gameShell(root, { charId: 'gedas', total: L.count, onHome, onRepeat: say });
  const round = createRound(shell);
  const hs = addHearts(shell, RECYCLE_LIVES);

  const belt = h('div', { class: 'rc-belt', 'aria-hidden': 'true' }, [h('span', { class: 'rc-wheel l' }), h('span', { class: 'rc-wheel r' })]);
  const line = h('div', { class: 'rc-line' }, [belt]);
  const binEls = {};
  const bins = h(
    'div',
    { class: 'rc-bins' },
    BIN_ORDER.map((b) => {
      const el = h('button', { type: 'button', class: `rc-bin rc-${BINS[b].color}`, 'aria-label': `${BINS[b].label} – ${BINS[b].color === 'green' ? 'žalias' : BINS[b].color === 'blue' ? 'mėlynas' : 'geltonas'} konteineris` }, [
        h('span', { class: 'rc-bin-art', html: BIN_SVG }, h('img', { class: 'rc-bin-ex', src: `${IMG}${EXAMPLE[b]}.webp`, alt: '', draggable: 'false' })),
        h('span', { class: 'rc-bin-label', text: BINS[b].label }),
      ]);
      onTap(el, () => tapBin(b));
      binEls[b] = el;
      return el;
    })
  );
  const game = h('div', { class: 'rc-game' }, [line, bins]);
  shell.board.append(game);

  // ---------- juostos ciklas ----------
  const now = () => performance.now();
  const speed = () => (line.clientWidth - itemW() * 0.65) / L.travel; // px/s – visa juosta per L.travel s
  const itemW = () => live[0]?.w || Math.min(110, line.clientWidth * 0.26);
  function syncBelt() {
    const v = speed();
    // juostos dryžiai juda tokiu pat greičiu kaip daiktai
    belt.style.setProperty('--belt-dur', `${(36 / v).toFixed(3)}s`);
    belt.classList.toggle('stopped', !running || now() < pausedUntil);
  }

  function spawn() {
    const data = queue[spawned++];
    const [id, name] = data;
    const el = h('div', { class: 'rc-item' }, [h('img', { src: `${IMG}${id}.webp`, alt: '', draggable: 'false' }), h('span', { class: 'rc-name', text: name })]);
    line.append(el);
    // atsiranda juostos pradžioje (ne už jos – kitaip uždengtų Gedo burbulą)
    const it = { el, data, x: 0, w: el.offsetWidth, drag: false };
    place(it);
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
    live.push(it);
    onDrag(el, { start: (p) => dragStart(it, p), move: (p) => dragMove(it, p), end: (p) => dragEnd(it, p) });
    sinceSpawn = 0;
  }
  const place = (it) => (it.el.style.transform = `translateX(${it.x}px)`);

  function tick(t) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (!running || document.hidden) return;
    if (t < pausedUntil) return syncBelt();
    syncBelt();
    const v = speed();
    sinceSpawn += dt;
    const empty = !live.length;
    if (spawned < L.count && (empty || (L.gap != null && sinceSpawn >= L.gap))) spawn();
    const end = line.clientWidth;
    for (const it of live.slice()) {
      // laikomas ar tempiamas daiktas „laiko“ nesustabdo – jo vieta juostoje vis tiek slenka
      it.x += v * dt;
      if (!it.drag?.moved) place(it);
      // nespėjai – juostos gale daiktas nukrenta (net jei jį dar laikai pirštu)
      if (it.x > end - it.w * 0.35) miss(it);
    }
  }

  // ---------- rūšiavimas ----------
  function front() {
    if (selected && live.includes(selected)) return selected;
    return live.filter((it) => !it.drag).sort((a, b) => b.x - a.x)[0] || null;
  }
  function selectItem(it) {
    if (!running || !live.includes(it)) return;
    sfx('tap');
    selected = selected === it ? null : it;
    live.forEach((x) => x.el.classList.toggle('sel', x === selected));
  }
  function tapBin(b) {
    if (!running) return;
    const it = front();
    pulse(binEls[b], 'squish');
    if (!it) return sfx('tap');
    sortInto(it, b);
  }

  function remove(it) {
    const i = live.indexOf(it);
    if (i >= 0) live.splice(i, 1);
    if (selected === it) selected = null;
  }

  /** Daiktas skrenda į konteinerį b (iš ten, kur yra dabar). */
  function flyTo(it, b, { ok }) {
    const from = it.el.getBoundingClientRect();
    const to = binEls[b].querySelector('.rc-bin-art').getBoundingClientRect();
    const ghost = h('img', { class: 'rc-fly', src: it.el.querySelector('img').src, alt: '', style: `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.width}px` });
    document.body.append(ghost);
    it.el.remove();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height * 0.3 - (from.top + from.width / 2);
    const a = ghost.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(0.8)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 },
      ],
      { duration: ok ? 420 : 650, easing: 'ease-in' }
    );
    a.onfinish = () => {
      ghost.remove();
      pulse(binEls[b], ok ? 'bounce' : 'shake');
      if (ok) burst(binEls[b], { count: 8, spread: 50 });
    };
  }

  function sortInto(it, b) {
    if (!live.includes(it)) return;
    remove(it);
    const [, name, right] = it.data;
    if (b === right) {
      flyTo(it, b, { ok: true });
      sfx('correct');
      shell.char.setEmotion('happy');
      done();
      return;
    }
    // klaida: daiktas vis tiek nukeliauja į tinkamą konteinerį (kad matytųsi, kur buvo teisinga)
    flyTo(it, right, { ok: false });
    binEls[right].classList.add('hint');
    setTimeout(() => binEls[right].classList.remove('hint'), PAUSE_AFTER_MISS + 300);
    loseLife(`${name}: ${BINS[right].say}`);
  }

  function miss(it) {
    remove(it);
    if (it.drag) {
      it.drag = false;
      it.el.classList.remove('dragging');
      BIN_ORDER.forEach((b) => binEls[b].classList.remove('over'));
    }
    const [, name, right] = it.data;
    it.el.classList.add('fall');
    setTimeout(() => it.el.remove(), 600);
    binEls[right].classList.add('hint');
    setTimeout(() => binEls[right].classList.remove('hint'), PAUSE_AFTER_MISS + 300);
    loseLife(`Nespėjai! ${name}: ${BINS[right].say}`);
  }

  function loseLife(text) {
    lives--;
    hs.set(lives, { shake: true });
    sfx('wrong');
    shell.char.setEmotion('encourage');
    shell.char.show(text);
    pausedUntil = now() + PAUSE_AFTER_MISS;
    if (lives <= 0) return end(false);
    done();
  }

  function done() {
    resolved++;
    shell.setProgress(resolved);
    if (resolved >= L.count) end(true);
  }

  async function end(won) {
    if (over) return;
    over = true;
    running = false;
    syncBelt();
    live.forEach((it) => it.el.classList.add('fall'));
    await wait(won ? 700 : PAUSE_AFTER_MISS);
    if (!round.alive) return;
    if (!won) return onFinish({ failed: true });
    sfx('correct');
    burst(bins, { count: 16 });
    shell.char.setEmotion('happy');
    shell.char.show('Puiku! Viskas surūšiuota!');
    await wait(1300);
    if (round.alive) onFinish({ stars: lives });
  }

  // ---------- tempimas ----------
  function dragStart(it, p) {
    if (!running || !live.includes(it)) return false;
    it.drag = { at: p, moved: false };
    return true;
  }
  function binAt(x, y) {
    return BIN_ORDER.find((b) => {
      const r = binEls[b].getBoundingClientRect();
      return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 30 && y <= r.bottom;
    });
  }
  function dragMove(it, p) {
    const d = it.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(p.x - d.at.x, p.y - d.at.y) < DRAG_PX) return;
    if (!d.moved) {
      d.moved = true;
      const r = it.el.getBoundingClientRect();
      d.off = { x: p.x - r.left, y: p.y - r.top };
      d.base = line.getBoundingClientRect();
      it.el.classList.add('dragging');
    }
    const x = p.x - d.off.x - d.base.left;
    const y = p.y - d.off.y - (it.el.offsetTop + d.base.top);
    it.el.style.transform = `translate(${x}px, ${y}px) scale(1.08)`;
    const over = binAt(p.x, p.y);
    BIN_ORDER.forEach((b) => binEls[b].classList.toggle('over', b === over));
  }
  function dragEnd(it, p) {
    const d = it.drag;
    it.drag = false;
    if (!d || !live.includes(it)) return; // jau nukrito (nespėjo)
    BIN_ORDER.forEach((b) => binEls[b].classList.remove('over'));
    if (!d.moved) return selectItem(it); // nepajudėjo – bakstelėjimas
    it.el.classList.remove('dragging');
    const b = running && binAt(p.x, p.y);
    if (b && live.includes(it)) return sortInto(it, b);
    place(it); // paleistas ne ant konteinerio – grįžta ant juostos
  }

  const onVis = () => {
    last = now();
  };
  document.addEventListener('visibilitychange', onVis);

  intro(shell, round, 'phrases/rusiuok_intro').then((ok) => {
    if (!ok) return;
    running = true;
    last = now();
    raf = requestAnimationFrame(tick);
  });
  syncBelt();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVis);
    document.querySelectorAll('.rc-fly').forEach((g) => g.remove());
    round.destroy();
  };
}
