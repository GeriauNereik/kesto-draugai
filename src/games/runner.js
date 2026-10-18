// „Miško bėgimas“ (kaip Chrome dinozauras): veikėjas bėga, vaikas bakstelėja – šoka per kliūtis.
// Kuo ilgiau bėgi, tuo greičiau ir tankiau kliūtys. Rekordas saugomas žaidėjui ir visada matomas.
// Lygis = kuriuo veikėju bėgama (žr. RUNNERS).
import { h, onTap } from '../ui/dom.js';
import { iconButton } from '../ui/button.js';
import { charPortrait, itemImg } from '../config/characters.js';
import { getRecord, saveRecord } from '../storage.js';
import { sfx } from '../sfx.js';
import { track } from '../sync/activity.js';

export const RUNNERS = [
  { id: 'domas', label: 'Domas' },
  { id: 'veja', label: 'Vėja' },
  { id: 'tadas', label: 'Tadas' },
  { id: 'kestas', label: 'Kęstas' },
  { id: 'gedas', label: 'Gedas', flip: true }, // žiūri į kairę – apverčiam
];
const GAME = 'runner';

// Kliūtys: daiktų piešiniai ir keli nupiešti (kelmas, akmuo). h – aukštis veikėjo dydžiais.
const ITEM_OBSTACLES = [
  { img: 'musmire', h: 0.55 },
  { img: 'kankorezis', h: 0.42 },
  { img: 'sraige', h: 0.4 },
  { img: 'lizdas', h: 0.38 },
];
const DRAWN = ['stump', 'rock', 'stumpTall'];

const fmt = (n) => String(Math.floor(n)).padStart(5, '0');
/** 1 taškas, 2 taškai, 10 taškų, 21 taškas… */
function points(n) {
  const d = n % 10;
  const t = n % 100;
  if (d === 1 && t !== 11) return 'taškas';
  if (d >= 2 && d <= 9 && (t < 12 || t > 19)) return 'taškai';
  return 'taškų';
}

function loadImg(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
}

export function runnerGame(root, { level, onHome }) {
  const who = RUNNERS[level - 1] || RUNNERS[0];
  const hero = loadImg(charPortrait(who.id));
  const items = Object.fromEntries(ITEM_OBSTACLES.map((o) => [o.img, loadImg(itemImg(o.img))]));

  // ---------- Maketas ----------
  const canvas = h('canvas', { class: 'run-canvas', 'aria-label': 'Bėgimo laukas. Bakstelėk, kad pašoktum.' });
  const hiEl = h('span', { class: 'run-hi' });
  const scoreEl = h('span', { class: 'run-score' });
  const hint = h('div', { class: 'run-hint' }, [h('b', { text: 'Bakstelėk – šok!' }), h('span', { text: 'Šok per kliūtis. Kuo toliau, tuo greičiau.' })]);
  const over = h('div', { class: 'run-over', hidden: true });
  const stage = h('div', { class: 'run-stage' }, [canvas, hint, over]);
  const screen = h('section', { class: 'screen runner' }, [
    h('header', { class: 'topbar' }, [
      iconButton({ icon: 'home', ariaLabel: 'Atgal', onClick: onHome }),
      h('div', { class: 'run-scores', 'aria-live': 'off' }, [hiEl, scoreEl]),
    ]),
    stage,
  ]);
  root.append(screen);

  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let dpr = 1;
  let ground = 0; // žemės linijos y
  let size = 80; // veikėjo dydis

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = Math.round(Math.min(H * 0.24, W * 0.24, 120));
    ground = Math.round(H * 0.8);
    if (state === 'ready' || state === 'over') draw();
  }

  // ---------- Būsena ----------
  let state = 'ready'; // ready | run | over
  let best = getRecord(GAME);
  let score = 0;
  let speed = 0; // px/s
  let base = 0;
  let elapsed = 0;
  let y = 0; // aukštis virš žemės (px, aukštyn teigiamas)
  let vy = 0;
  let holding = false;
  let obstacles = [];
  let nextGap = 0;
  let scroll = 0; // fono slinkimas
  let runPhase = 0;
  let lastMilestone = 0;
  let deadAt = 0;
  let raf = 0;
  let last = 0;

  const physics = () => {
    // Šuolio aukštis ~1,7 veikėjo; ore ~0,62 s (pradžioje). Laikant – šiek tiek aukščiau.
    const apex = size * 1.7;
    const tUp = 0.31;
    return { g: (2 * apex) / (tUp * tUp), v0: (2 * apex) / tUp };
  };

  function showScores() {
    hiEl.textContent = `Rekordas ${fmt(best)}`;
    scoreEl.textContent = fmt(score);
  }

  function reset() {
    score = 0;
    elapsed = 0;
    y = 0;
    vy = 0;
    obstacles = [];
    base = Math.max(260, W * 0.55);
    speed = base;
    nextGap = W * 0.9;
    lastMilestone = 0;
    showScores();
  }

  function start() {
    reset();
    state = 'run';
    hint.hidden = true;
    over.hidden = true;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function jump() {
    if (state === 'ready') return start(), jump();
    if (state === 'over') {
      if (performance.now() - deadAt > 700) start();
      return;
    }
    if (y > 0.5) return; // jau ore
    vy = physics().v0;
    holding = true;
    sfx('jump');
  }

  // ---------- Kliūtys ----------
  function spawn() {
    // Kuo greičiau – tuo dažniau pasitaiko po 2–3 kliūtis iš eilės.
    const diff = Math.min(1, elapsed / 90);
    const count = Math.random() < 0.12 + diff * 0.3 ? (Math.random() < diff * 0.5 ? 3 : 2) : 1;
    // Grupė ne ilgesnė, nei įmanoma peršokti tuo greičiu (šuolio ilgis minus veikėjo plotis su atsarga).
    const maxSpan = speed * 0.62 - size * 1.0;
    let x = W + 20;
    let span = 0;
    for (let i = 0; i < count; i++) {
      const o = makeObstacle(count > 1);
      if (i > 0 && span + size * 0.05 + o.w > maxSpan) break;
      o.x = x;
      obstacles.push(o);
      span += (i ? size * 0.05 : 0) + o.w;
      x += o.w + size * 0.05;
    }
  }

  function makeObstacle(small) {
    const pool = small ? [...ITEM_OBSTACLES.map((o) => o.img), 'rock'] : [...ITEM_OBSTACLES.map((o) => o.img), ...DRAWN];
    const kind = pool[Math.floor(Math.random() * pool.length)];
    const item = ITEM_OBSTACLES.find((o) => o.img === kind);
    if (item) {
      const hh = size * item.h;
      return { kind: 'item', img: kind, w: hh, h: hh };
    }
    if (kind === 'stump') return { kind, w: size * 0.42, h: size * 0.5 };
    if (kind === 'stumpTall') return { kind, w: size * 0.36, h: size * 0.78 };
    return { kind: 'rock', w: size * 0.55, h: size * 0.32 };
  }

  /** Atstumas iki kitos kliūties: ne mažiau, nei reikia nusileisti ir vėl pašokti. */
  function gapAfter() {
    const air = 0.62 * size * 1.05;
    const minGap = speed * 0.62 + air;
    const maxGap = minGap + speed * (1.1 - Math.min(0.7, elapsed / 120));
    return minGap + Math.random() * (maxGap - minGap);
  }

  function hit(o) {
    // Atlaidus susidūrimas: veikėjo ir kliūties „dėžutės“ sumažintos.
    const hx = W * 0.14 + size * 0.24;
    const hw = size * 0.5;
    const hy = ground - y - size * 0.82;
    const hh = size * 0.74;
    const ox = o.x + o.w * 0.15;
    const ow = o.w * 0.7;
    const oy = ground - o.h * 0.85;
    const oh = o.h * 0.85;
    return hx < ox + ow && hx + hw > ox && hy < oy + oh && hy + hh > oy;
  }

  // ---------- Ciklas ----------
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    if (state === 'run') raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    elapsed += dt;
    // Greitėja: +~1,5 % per sekundę, iki 2,3× pradinio.
    speed = base * Math.min(2.3, 1 + elapsed * 0.015);
    const { g } = physics();
    // Paleidus pirštą anksti – žemesnis šuolis (kaip Chrome žaidime).
    const grav = vy > 0 && !holding ? g * 1.9 : g;
    vy -= grav * dt;
    y = Math.max(0, y + vy * dt);
    if (y === 0 && vy < 0) vy = 0;

    const dx = speed * dt;
    scroll += dx;
    runPhase += dt * (speed / base) * 12;
    nextGap -= dx;
    if (nextGap <= 0) {
      spawn();
      nextGap = gapAfter();
    }
    for (const o of obstacles) o.x -= dx;
    obstacles = obstacles.filter((o) => o.x + o.w > -10);

    score += dx / (base * 0.1);
    const m = Math.floor(score / 100);
    if (m > lastMilestone) {
      lastMilestone = m;
      sfx('milestone');
      scoreEl.classList.remove('flash');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('flash');
    }
    showScores();

    if (obstacles.some(hit)) die();
  }

  function die() {
    state = 'over';
    deadAt = performance.now();
    sfx('crash');
    navigator.vibrate?.(120);
    const final = Math.floor(score);
    const isRecord = saveRecord(GAME, final);
    if (isRecord) best = final;
    showScores();
    track({ k: 'run', g: GAME, n: 'Miško bėgimas', p: final, d: Math.round(elapsed) });
    const again = h('button', { type: 'button', class: 'btn btn-primary run-again' }, [h('span', { class: 'btn-label', text: 'Dar kartą' })]);
    onTap(again, () => start());
    over.replaceChildren(
      h('div', { class: 'run-card' }, [
        h('p', { class: 'run-oi', text: isRecord && final > 0 ? 'Naujas rekordas!' : 'Oi!' }),
        h('p', { class: 'run-final' }, [h('b', { text: String(final) }), ` ${points(final)}`]),
        h('p', { class: 'run-best', text: `Rekordas: ${best}` }),
        again,
      ])
    );
    over.hidden = false;
    if (isRecord && final > 0) setTimeout(() => sfx('fanfare'), 450);
  }

  // ---------- Piešimas ----------
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    for (const o of obstacles) drawObstacle(o);
    drawHero();
  }

  function drawBackground() {
    // Tolimi medžiai (lėtai slenka – gylio pojūtis)
    const far = scroll * 0.25;
    ctx.fillStyle = 'rgba(76, 185, 99, 0.18)';
    const step = 150;
    for (let x = -((far % step) + step); x < W + step; x += step) {
      const k = Math.abs(Math.floor((x + far) / step)) % 3;
      const th = size * (0.9 + k * 0.35);
      tree(x + 40, ground - size * 0.05, th);
    }
    // Žemė
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, ground - 2, W, 6);
    ctx.fillStyle = '#c9a26b';
    ctx.fillRect(0, ground + 4, W, H - ground);
    // Smulkūs akmenukai ir žolės kuokšteliai (slenka kartu su kliūtimis)
    ctx.fillStyle = 'rgba(90, 56, 37, 0.25)';
    const s2 = 46;
    for (let x = -(scroll % s2); x < W; x += s2) {
      const k = Math.abs(Math.floor((x + scroll) / s2)) % 5;
      ctx.fillRect(x + k * 6, ground + 12 + k * 4, 4 + k, 3);
    }
    ctx.strokeStyle = '#5fa83a';
    ctx.lineWidth = 2;
    const s3 = 70;
    for (let x = -(scroll % s3); x < W; x += s3) {
      ctx.beginPath();
      ctx.moveTo(x, ground);
      ctx.lineTo(x - 3, ground - 7);
      ctx.moveTo(x + 3, ground);
      ctx.lineTo(x + 5, ground - 9);
      ctx.stroke();
    }
  }

  function tree(x, base, th) {
    ctx.beginPath();
    ctx.moveTo(x, base - th);
    ctx.lineTo(x + th * 0.32, base);
    ctx.lineTo(x - th * 0.32, base);
    ctx.closePath();
    ctx.fill();
  }

  function drawObstacle(o) {
    const top = ground - o.h;
    if (o.kind === 'item') {
      const img = items[o.img];
      if (img.complete && img.naturalWidth) ctx.drawImage(img, o.x, top, o.w, o.h);
      else roundRect(o.x, top, o.w, o.h, 8, '#e5533d');
      return;
    }
    if (o.kind === 'rock') {
      ctx.fillStyle = '#9e9a93';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, ground - o.h / 2 + 2, o.w / 2, o.h / 2 + 2, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w * 0.38, ground - o.h * 0.68, o.w * 0.14, o.h * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // Kelmas
    roundRect(o.x, top + o.w * 0.12, o.w, o.h - o.w * 0.12, 4, '#8a5a35');
    ctx.fillStyle = '#d9b07a';
    ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2, top + o.w * 0.12, o.w / 2, o.w * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a77a4a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2, top + o.w * 0.12, o.w * 0.25, o.w * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.3, top + o.w * 0.3);
    ctx.lineTo(o.x + o.w * 0.3, ground - 4);
    ctx.moveTo(o.x + o.w * 0.65, top + o.w * 0.35);
    ctx.lineTo(o.x + o.w * 0.65, ground - 6);
    ctx.stroke();
  }

  function roundRect(x, y0, w, hh, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + r, y0);
    ctx.arcTo(x + w, y0, x + w, y0 + hh, r);
    ctx.arcTo(x + w, y0 + hh, x, y0 + hh, r);
    ctx.arcTo(x, y0 + hh, x, y0, r);
    ctx.arcTo(x, y0, x + w, y0, r);
    ctx.fill();
  }

  function drawHero() {
    const x = W * 0.14;
    const onGround = y < 0.5;
    // Bėgimas: atšokinėjimas ir pasvirimas; ore – pasilenkia į priekį; žuvus – apvirsta.
    const bob = state === 'run' && onGround ? Math.abs(Math.sin(runPhase)) * size * 0.06 : 0;
    const tilt = state === 'over' ? -0.5 : onGround ? Math.sin(runPhase) * 0.06 : 0.12;
    const squash = state === 'run' && onGround ? 1 - Math.abs(Math.cos(runPhase)) * 0.05 : 1;
    // Šešėlis
    const shadow = Math.max(0.35, 1 - y / (size * 2));
    ctx.fillStyle = `rgba(90, 56, 37, ${0.18 * shadow})`;
    ctx.beginPath();
    ctx.ellipse(x + size / 2, ground + 2, size * 0.32 * shadow, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hero.complete || !hero.naturalWidth) return;
    ctx.save();
    ctx.translate(x + size / 2, ground - y - bob);
    ctx.rotate(tilt);
    ctx.scale(who.flip ? -1 : 1, squash);
    ctx.drawImage(hero, -size / 2, -size, size, size);
    ctx.restore();
  }

  // ---------- Valdymas ----------
  const down = (e) => {
    if (e.target.closest?.('button')) return;
    e.preventDefault?.();
    jump();
  };
  const up = () => (holding = false);
  stage.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  const key = (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (e.type === 'keydown' && !e.repeat) jump();
      if (e.type === 'keyup') up();
    }
  };
  window.addEventListener('keydown', key);
  window.addEventListener('keyup', key);
  const onHide = () => {
    // Išėjus iš programėlės – sustabdom (grįžus nereikia „staigios mirties“).
    if (document.hidden && state === 'run') {
      cancelAnimationFrame(raf);
    } else if (!document.hidden && state === 'run') {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };
  document.addEventListener('visibilitychange', onHide);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  window.addEventListener('resize', resize);
  hero.onload = () => state !== 'run' && draw();

  resize();
  reset();
  draw();

  return () => {
    cancelAnimationFrame(raf);
    ro?.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('keydown', key);
    window.removeEventListener('keyup', key);
    document.removeEventListener('visibilitychange', onHide);
  };
}
