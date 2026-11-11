// „Miško bėgimas“ (kaip Chrome dinozauras): veikėjas bėga, vaikas bakstelėja – šoka per kliūtis.
// Pakeliui renkami žetonai (+10 taškų), kartais pasitaiko magnetas – 10 s pritraukia žetonus.
// Kuo ilgiau bėgi, tuo greičiau ir tankiau kliūtys. Rekordas saugomas žaidėjui ir visada matomas.
// Pradžioje vaikas pasirenka vieną iš 4 šio žaidimo veikėjų; kiekvienas turi savo rekordą.
import { h, onTap } from '../ui/dom.js';
import { iconButton } from '../ui/button.js';
import { itemImg } from '../config/characters.js';
import { getRecord, saveRecord } from '../storage.js';
import { sfx } from '../sfx.js';
import { track } from '../sync/activity.js';

// Tik šio žaidimo veikėjai (public/assets/runner/*.webp) – vyresniems (~9 m.), jau nupiešti bėgantys.
export const RUNNERS = [
  { id: 'vilkas', label: 'Vilkas' },
  { id: 'lape', label: 'Lapė' },
  { id: 'lusis', label: 'Lūšis' },
  { id: 'meska', label: 'Meška' },
];
const runnerImg = (id) => `${import.meta.env.BASE_URL}assets/runner/${id}.webp`;
// Bėgimo kadrai (4: žingsnis, kelis aukštyn, kitas žingsnis, kitas kelis) – rankos ir kojos juda.
const runFrame = (id, i) => `${import.meta.env.BASE_URL}assets/runner/run/${id}-${i}.webp`;
const PICKUP = (n) => `${import.meta.env.BASE_URL}assets/runner/${n}.webp`;
const COIN_POINTS = 10; // kiek taškų už žetoną
const MAGNET_SECS = 10; // kiek laiko magnetas traukia žetonus
const LAST_KEY = 'kd.runner.last';
const GAME = 'runner';
const recordKey = (id) => `${GAME}:${id}`;

// Kliūtys: daiktų piešiniai ir keli nupiešti (kelmas, akmuo). h – aukštis veikėjo dydžiais.
const ITEM_OBSTACLES = [
  { img: 'musmire', h: 0.5 }, // aukštis – matomos (nukirptos) dalies, veikėjo dydžiais
  { img: 'kankorezis', h: 0.4 },
  { img: 'sraige', h: 0.3 },
  { img: 'lizdas', h: 0.28 },
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

function readLast() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
function writeLast(id) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* be išsaugojimo */
  }
}

function loadImg(src) {
  const img = new Image();
  img.decoding = 'async';
  img.addEventListener('load', () => (img.box = opaqueBox(img)));
  img.src = src;
  return img;
}

/** Nepermatomos dalies ribos (piešiniuose yra tuščių kraštų – be jų veikėjai ir kliūtys „kabotų“ virš žemės). */
function opaqueBox(img) {
  const full = { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
  try {
    const n = 128; // pakanka – tikslumas ~1 %
    const c = document.createElement('canvas');
    c.width = n;
    c.height = n;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n).data;
    let x0 = n, y0 = n, x1 = -1, y1 = -1;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (d[(y * n + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return full;
    const k = img.naturalWidth / n;
    const kh = img.naturalHeight / n;
    return { sx: x0 * k, sy: y0 * kh, sw: (x1 - x0 + 1) * k, sh: (y1 - y0 + 1) * kh };
  } catch {
    return full;
  }
}

/** Piešia nukirptą paveikslėlį: apačios centras taške (cx, bottom), aukštis hh. Grąžina plotį. */
function drawTrimmed(ctx, img, cx, bottom, hh) {
  const b = img.box || { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
  const ww = (hh * b.sw) / b.sh;
  ctx.drawImage(img, b.sx, b.sy, b.sw, b.sh, cx - ww / 2, bottom - hh, ww, hh);
  return ww;
}

export function runnerGame(root, { onHome }) {
  const heroes = Object.fromEntries(RUNNERS.map((r) => [r.id, loadImg(runnerImg(r.id))]));
  const frames = Object.fromEntries(RUNNERS.map((r) => [r.id, [0, 1, 2, 3].map((i) => loadImg(runFrame(r.id, i)))]));
  const coinImg = loadImg(PICKUP('coin'));
  const magnetImg = loadImg(PICKUP('magnet'));
  let who = RUNNERS.find((r) => r.id === readLast()) || RUNNERS[0];
  let hero = heroes[who.id];
  const items = Object.fromEntries(ITEM_OBSTACLES.map((o) => [o.img, loadImg(itemImg(o.img))]));

  // ---------- Maketas ----------
  const canvas = h('canvas', { class: 'run-canvas', 'aria-label': 'Bėgimo laukas. Bakstelėk, kad pašoktum.' });
  const hiEl = h('span', { class: 'run-hi' });
  const scoreEl = h('span', { class: 'run-score' });
  const coinsEl = h('span', { class: 'run-coins' }, [h('img', { src: PICKUP('coin'), alt: '' }), h('b', { text: '0' })]);
  const hint = h('div', { class: 'run-hint' }, [h('b', { text: 'Bakstelėk – šok!' }), h('span', { text: 'Šok per kliūtis. Kuo toliau, tuo greičiau.' })]);
  const over = h('div', { class: 'run-over', hidden: true });
  const picker = h('div', { class: 'run-pick' });
  const stage = h('div', { class: 'run-stage' }, [canvas, hint, over, picker]);
  const screen = h('section', { class: 'screen runner' }, [
    h('header', { class: 'topbar' }, [
      iconButton({ icon: 'home', ariaLabel: 'Atgal', onClick: onHome }),
      h('div', { class: 'run-scores', 'aria-live': 'off' }, [coinsEl, hiEl, scoreEl]),
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
    // Žemė – apačioje (aukštame ekrane žemės juosta neišauga per daug)
    ground = Math.round(H - Math.min(H * 0.2, Math.max(70, H * 0.12)));
    if (state !== 'run') draw();
  }

  // ---------- Būsena ----------
  let state = 'pick'; // pick | ready | run | over
  let best = 0;
  let score = 0;
  let speed = 0; // px/s
  let base = 0;
  let elapsed = 0;
  let y = 0; // aukštis virš žemės (px, aukštyn teigiamas)
  let vy = 0;
  let holding = false;
  let obstacles = [];
  let coins = []; // { x, y (aukštis virš žemės), got, t }
  let pops = []; // „+10“ užrašai
  let magnet = null; // magnetas trasoje { x, y }
  let magnetT = 0; // kiek sekundžių dar veikia
  let nextMagnet = 0; // po kiek px pasirodys kitas magnetas
  let nextRow = 0; // po kiek px – žetonų eilė ant žemės
  let coinCount = 0;
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
    coinsEl.lastChild.textContent = String(coinCount);
  }

  function reset() {
    score = 0;
    elapsed = 0;
    y = 0;
    vy = 0;
    obstacles = [];
    coins = [];
    pops = [];
    magnet = null;
    magnetT = 0;
    coinCount = 0;
    base = Math.max(260, W * 0.55);
    nextMagnet = base * (20 + Math.random() * 15); // pirmas magnetas – po ~20–35 s
    nextRow = W * 1.6;
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

  // ---------- Veikėjo pasirinkimas ----------
  function showPicker() {
    state = 'pick';
    cancelAnimationFrame(raf);
    hint.hidden = true;
    over.hidden = true;
    picker.replaceChildren(
      h('p', { class: 'run-pick-title', text: 'Kuo bėgsi?' }),
      h(
        'div',
        { class: 'run-pick-grid' },
        RUNNERS.map((r) => {
          const b = h('button', { type: 'button', class: `run-pick-btn${r.id === who.id ? ' on' : ''}`, 'aria-label': `${r.label}, rekordas ${getRecord(recordKey(r.id))}` }, [
            h('img', { src: runnerImg(r.id), alt: '', decoding: 'async' }),
            h('b', { text: r.label }),
            h('span', { class: 'run-pick-rec', text: `🏆 ${getRecord(recordKey(r.id))}` }),
          ]);
          onTap(b, () => choose(r));
          return b;
        })
      )
    );
    picker.hidden = false;
    draw();
  }

  function choose(r) {
    who = r;
    hero = heroes[r.id];
    writeLast(r.id);
    best = getRecord(recordKey(r.id));
    picker.hidden = true;
    state = 'ready';
    hint.hidden = false;
    reset();
    draw();
  }

  function jump() {
    if (state === 'pick') return;
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
    // Žetonų lankas virš kliūčių – surenkamas šokant
    if (Math.random() < 0.55) {
      const n = 3 + Math.floor(Math.random() * 3);
      const mid = W + 20 + span / 2;
      const step = size * 0.42;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        coins.push({ x: mid + (i - (n - 1) / 2) * step, y: size * (0.55 + 1.05 * 4 * t * (1 - t)), got: false, t: 0 });
      }
    }
  }

  /** Žetonų eilė ant žemės (tarp kliūčių) – tik jei toje vietoje nėra kliūties. */
  function spawnRow() {
    const n = 4 + Math.floor(Math.random() * 4);
    const step = size * 0.45;
    const x0 = W + 20;
    const x1 = x0 + n * step;
    if (obstacles.some((o) => o.x < x1 + size && o.x + o.w > x0 - size)) return false;
    for (let i = 0; i < n; i++) coins.push({ x: x0 + i * step, y: size * 0.32, got: false, t: 0 });
    return true;
  }

  function makeObstacle(small) {
    const pool = small ? [...ITEM_OBSTACLES.map((o) => o.img), 'rock'] : [...ITEM_OBSTACLES.map((o) => o.img), ...DRAWN];
    const kind = pool[Math.floor(Math.random() * pool.length)];
    const item = ITEM_OBSTACLES.find((o) => o.img === kind);
    if (item) {
      const hh = size * item.h;
      const b = items[kind].box;
      return { kind: 'item', img: kind, w: b ? (hh * b.sw) / b.sh : hh, h: hh };
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

    // ---- žetonai ir magnetas ----
    nextRow -= dx;
    if (nextRow <= 0) nextRow = spawnRow() ? W * (0.9 + Math.random() * 1.4) : size * 2;
    nextMagnet -= dx;
    if (nextMagnet <= 0 && !magnet && magnetT <= 0) {
      if (!obstacles.some((o) => o.x > W - size * 2)) magnet = { x: W + 20, y: size * (0.45 + Math.random() * 0.75) };
      nextMagnet = magnet ? base * (35 + Math.random() * 25) : size * 3;
    }
    const hx = W * 0.14 + size / 2; // veikėjo centras
    const hy = y + size * 0.5;
    if (magnet) {
      magnet.x -= dx;
      if (Math.hypot(magnet.x - hx, magnet.y - hy) < size * 0.8) {
        magnet = null;
        magnetT = MAGNET_SECS;
        sfx('fanfare');
        pops.push({ x: hx, y: hy + size * 0.6, text: 'Magnetas!', t: 0 });
      } else if (magnet.x < -size) magnet = null;
    }
    if (magnetT > 0) magnetT = Math.max(0, magnetT - dt);
    const pull = magnetT > 0 ? W * 0.6 : 0;
    for (const c of coins) {
      c.t += dt;
      if (c.got) continue;
      c.x -= dx;
      // magnetas: artimi žetonai skrenda prie veikėjo
      const d = Math.hypot(c.x - hx, c.y - hy);
      if (pull && d < pull && c.x > hx - size) {
        const k = Math.min(1, (dt * (900 + speed)) / Math.max(1, d));
        c.x += (hx - c.x) * k;
        c.y += (hy - c.y) * k;
      }
      if (Math.hypot(c.x - hx, c.y - hy) < size * 0.5) {
        c.got = true;
        c.t = 0;
        coinCount++;
        score += COIN_POINTS;
        sfx('star', coinCount % 3);
        pops.push({ x: c.x, y: c.y, text: `+${COIN_POINTS}`, t: 0 });
      }
    }
    coins = coins.filter((c) => (c.got ? c.t < 0.25 : c.x > -size));
    for (const p of pops) p.t += dt;
    pops = pops.filter((p) => p.t < 0.8);

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
    const isRecord = saveRecord(recordKey(who.id), final);
    if (isRecord) best = final;
    showScores();
    track({ k: 'run', g: GAME, n: `Miško bėgimas (${who.label})`, p: final, d: Math.round(elapsed) });
    const again = h('button', { type: 'button', class: 'btn btn-primary run-again' }, [h('span', { class: 'btn-label', text: 'Dar kartą' })]);
    onTap(again, () => start());
    const other = h('button', { type: 'button', class: 'run-other' }, [
      h('img', { src: runnerImg(who.id), alt: '' }),
      h('span', { text: 'Kitas veikėjas' }),
    ]);
    onTap(other, showPicker);
    over.replaceChildren(
      h('div', { class: 'run-card' }, [
        h('p', { class: 'run-oi', text: isRecord && final > 0 ? 'Naujas rekordas!' : 'Oi!' }),
        h('p', { class: 'run-final' }, [h('b', { text: String(final) }), ` ${points(final)}`]),
        h('p', { class: 'run-best', text: `Rekordas: ${best}` }),
        coinCount ? h('p', { class: 'run-coins-final' }, [h('img', { src: PICKUP('coin'), alt: '' }), ` ${coinCount} × ${COIN_POINTS} taškų`]) : null,
        again,
        other,
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
    drawPickups();
    drawHero();
    drawPops();
    drawMagnetHud();
  }

  // ---------- Žetonai, magnetas ----------
  function drawPickups() {
    const cs = size * 0.36;
    for (const c of coins) {
      const cx = c.x;
      const cy = ground - c.y;
      if (c.got) {
        // paimtas – trumpai išsipučia ir išnyksta
        ctx.globalAlpha = Math.max(0, 1 - c.t / 0.25);
        const k = 1 + c.t * 3;
        if (coinImg.complete && coinImg.naturalWidth) ctx.drawImage(coinImg, cx - (cs * k) / 2, cy - (cs * k) / 2, cs * k, cs * k);
        ctx.globalAlpha = 1;
        continue;
      }
      // „sukasi“: plotis pulsuoja
      const sx = 0.75 + 0.25 * Math.abs(Math.cos(c.t * 4 + c.x * 0.01));
      if (coinImg.complete && coinImg.naturalWidth) ctx.drawImage(coinImg, cx - (cs * sx) / 2, cy - cs / 2, cs * sx, cs);
      else {
        ctx.fillStyle = '#ffc531';
        ctx.beginPath();
        ctx.arc(cx, cy, cs / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (magnet) {
      const ms = size * 0.55;
      const by = Math.sin(performance.now() / 250) * size * 0.06;
      ctx.fillStyle = 'rgba(255, 220, 120, 0.35)';
      ctx.beginPath();
      ctx.arc(magnet.x, ground - magnet.y + by, ms * 0.7, 0, Math.PI * 2);
      ctx.fill();
      if (magnetImg.complete && magnetImg.naturalWidth) ctx.drawImage(magnetImg, magnet.x - ms / 2, ground - magnet.y - ms / 2 + by, ms, ms);
    }
  }

  function drawPops() {
    ctx.textAlign = 'center';
    for (const p of pops) {
      const a = Math.max(0, 1 - p.t / 0.8);
      ctx.globalAlpha = a;
      ctx.font = `800 ${Math.round(size * (p.text.length > 4 ? 0.22 : 0.26))}px 'Baloo 2', system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#5a3825';
      ctx.fillStyle = '#ffd54f';
      const yy = ground - p.y - p.t * size * 0.8;
      ctx.strokeText(p.text, p.x, yy);
      ctx.fillText(p.text, p.x, yy);
    }
    ctx.globalAlpha = 1;
  }

  /** Magneto laikas – kampe ikona su mažėjančiu žiedu. */
  function drawMagnetHud() {
    if (magnetT <= 0) return;
    const r = Math.max(22, size * 0.26);
    const cx = 16 + r;
    const cy = 14 + r;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = magnetT < 3 && Math.floor(magnetT * 4) % 2 ? '#ff9f43' : '#e5533d';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * magnetT) / MAGNET_SECS);
    ctx.stroke();
    if (magnetImg.complete && magnetImg.naturalWidth) ctx.drawImage(magnetImg, cx - r * 0.62, cy - r * 0.62, r * 1.24, r * 1.24);
  }

  // Debesėliai (lėtai slenka) ir saulė – kad aukštame ekrane dangus nebūtų tuščias.
  const clouds = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: 0.08 + i * 0.11 + Math.random() * 0.05, s: 0.7 + Math.random() * 0.6, v: 0.04 + Math.random() * 0.05 }));

  function drawSky() {
    const skyH = ground - size * 1.2;
    // Saulė
    const sx = W * 0.82;
    const sy = Math.min(skyH * 0.18, 70);
    const sr = Math.min(W, H) * 0.07;
    ctx.fillStyle = 'rgba(255, 213, 79, 0.25)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    // Debesys
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    for (const c of clouds) {
      const span = W + 200;
      const x = ((((c.x * span - scroll * c.v) % span) + span) % span) - 100;
      const y = c.y * skyH;
      const r = Math.min(W, H) * 0.05 * c.s;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 1.1, y - r * 0.45, r * 1.25, 0, Math.PI * 2);
      ctx.arc(x + r * 2.3, y, r * 0.95, 0, Math.PI * 2);
      ctx.rect(x, y, r * 2.3, r * 0.9);
      ctx.fill();
    }
  }

  function drawBackground() {
    drawSky();
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
      if (img.complete && img.naturalWidth) drawTrimmed(ctx, img, o.x + o.w / 2, ground + 1, o.h);
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
    const fr = frames[who.id];
    const animated = fr.every((f) => f.complete && f.naturalWidth);
    // Bėgimas: kadrai keičiasi (juda kojos ir rankos), šiek tiek atšokinėja; ore – kadras su pakeltu keliu; žuvus – apvirsta.
    const bob = state === 'run' && onGround ? Math.abs(Math.sin(runPhase)) * size * (animated ? 0.03 : 0.06) : 0;
    const tilt = state === 'over' ? -0.5 : onGround ? Math.sin(runPhase) * (animated ? 0.02 : 0.06) : 0.1;
    const squash = state === 'run' && onGround && !animated ? 1 - Math.abs(Math.cos(runPhase)) * 0.05 : 1;
    // Šešėlis
    const shadow = Math.max(0.35, 1 - y / (size * 2));
    ctx.fillStyle = `rgba(90, 56, 37, ${0.18 * shadow})`;
    ctx.beginPath();
    ctx.ellipse(x + size / 2, ground + 2, size * 0.32 * shadow, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // magneto aura
    if (magnetT > 0) {
      const pulse = 1 + Math.sin(performance.now() / 160) * 0.06;
      ctx.strokeStyle = 'rgba(229, 83, 61, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + size / 2, ground - y - size * 0.5, size * 0.62 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    let img = hero;
    if (animated && state === 'run') img = onGround ? fr[Math.floor(runPhase / 1.35) % 4] : fr[1];
    else if (animated && state === 'ready') img = fr[0];
    if (!img.complete || !img.naturalWidth) return;
    ctx.save();
    ctx.translate(x + size / 2, ground - y - bob);
    ctx.rotate(tilt);
    ctx.scale(1, squash);
    if (img === hero) drawTrimmed(ctx, img, 0, 1, size * 0.92); // +1 px – kojos ant žolės, ne virš jos
    else {
      // visi kadrai vienodo dydžio (paruošti iš anksto) – piešiam visą kadrą, apačia ant žemės
      const hh = size * 0.98;
      const ww = (hh * img.naturalWidth) / img.naturalHeight;
      ctx.drawImage(img, -ww / 2, 1 - hh, ww, hh);
    }
    ctx.restore();
  }

  // ---------- Valdymas ----------
  const down = (e) => {
    if (e.target.closest?.('button')) return;
    e.preventDefault?.();
    jump();
  };
  const up = () => (holding = false);
  screen.addEventListener('pointerdown', down);
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
  Object.values(heroes).forEach((img) => img.addEventListener('load', () => state !== 'run' && draw()));

  resize();
  reset();
  showPicker();

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
