// Gyvi veikėjai: animacija iš dalių (cut-out / paper doll) su Web Animations API.
//
//   const domas = createCharacter(el, 'domas');
//   domas.setState('idle' | 'think');      // nuolatinė būsena
//   domas.play('happy' | 'encourage' | 'wiggle');   // vienkartinė, po jos grįžta į būseną
//   domas.talk(ms | audioEl | Promise);    // burna juda, kol skamba garsas
//   domas.destroy();
//
// Kiekvienas sluoksnis – trys įdėti "kanalai" su tuo pačiu sukimosi tašku:
//   idle (nuolatinis judesys) > act (vienkartinis) > talk (kalbėjimas) > turinys.
// Taip judesiai susideda natūraliai ir vienas kito nenutraukia (be composite: 'add').
//
// Jei veikėjas dar neturi dalių (public/assets/rigs/{id}/), naudojamas atsarginis variantas:
// visas paveikslėlis su emocijomis (_think / _happy / _encourage), judinamas tik poslinkiu
// ir pasukimu – iliustracija neiškraipoma (be scale).
import { charImg, CHARACTERS } from '../config/characters.js';
import { rigConfig, hasRig, RIG_BASE, effectiveTuning } from './rig-config.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);

const EASE = {
  soft: 'cubic-bezier(.45,0,.55,1)', // kvėpavimas, siūbavimas
  out: 'cubic-bezier(.22,1,.36,1)',
  in: 'cubic-bezier(.55,0,.75,.2)',
  back: 'cubic-bezier(.34,1.56,.64,1)',
};

const FALLBACK_IMG = { idle: 'happy', think: 'think', happy: 'happy', encourage: 'encourage', wiggle: null };

const instances = new Set();

/** Sunaikina visus veikėjus elemento viduje (keičiant ekraną – kad nebeliktų laikmačių fone). */
export function destroyWithin(rootEl) {
  for (const c of [...instances]) if (rootEl.contains(c.el)) c.destroy();
}

function div(cls) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

function makeImg(src) {
  const img = new Image();
  img.src = src;
  img.alt = '';
  img.draggable = false;
  img.decoding = 'async';
  img.className = 'rig-img';
  return img;
}

/** Sluoksnis su trimis kanalais. Grąžina { el, idle, act, talk, content }. */
function makeNode(pivot = [0.5, 0.5]) {
  const origin = `${pivot[0] * 100}% ${pivot[1] * 100}%`;
  const el = div('rig-layer');
  const idle = div('rig-ch');
  const act = div('rig-ch');
  const talk = div('rig-ch');
  [idle, act, talk].forEach((c) => (c.style.transformOrigin = origin));
  el.append(idle);
  idle.append(act);
  act.append(talk);
  return { el, idle, act, talk, content: talk, origin };
}

export function createCharacter(container, id, { state: initialState = 'idle', config: override } = {}) {
  const rigged = hasRig(id) || !!override;
  const cfg = rigged ? rigConfig(id, override) : null;
  const tune = effectiveTuning(id, cfg?.tuning);
  const sp = (ms) => ms / (tune.speed || 1);

  const root = div(`rig ${rigged ? 'rig-full' : 'rig-fallback'}`);
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', CHARACTERS[id]?.name || id);
  root.style.opacity = '0';
  const top = makeNode([0.5, 1]); // visas veikėjas (šuoliai), sukasi apie pėdas
  root.append(top.el);

  const nodes = {}; // id -> node
  const variants = {}; // 'eyes' | 'mouth' | 'emotion' -> { name: img }
  const imgs = [];

  if (rigged) {
    // 1) sukuriam visus sluoksnius, 2) kiekvienam tėvui sudedam vaikus + savo paveikslėlį pagal indeksą
    cfg.layers.forEach((l) => {
      const n = makeNode(l.pivot || [0.5, 0.5]);
      n.cfg = l;
      if (l.file) {
        n.img = makeImg(RIG_BASE + id + '/' + l.file);
        imgs.push(n.img);
      } else {
        variants[l.id] = {};
        n.img = div('rig-variants');
        for (const [name, f] of Object.entries(l.files)) {
          const im = makeImg(RIG_BASE + id + '/' + f);
          im.classList.add('rig-var');
          variants[l.id][name] = im;
          n.img.append(im);
          imgs.push(im);
        }
      }
      nodes[l.id] = n;
    });
    const items = new Map([[top, []]]);
    cfg.layers.forEach((l, i) => {
      const n = nodes[l.id];
      if (!items.has(n)) items.set(n, []);
      items.get(n).push({ i, el: n.img });
      const parent = l.parent ? nodes[l.parent] : top;
      if (!items.has(parent)) items.set(parent, []);
      items.get(parent).push({ i, el: n.el });
    });
    for (const [n, list] of items) list.sort((a, b) => a.i - b.i).forEach((it) => n.content.append(it.el));
  } else {
    // Atsarginis variantas: trys emocijų paveikslėliai vienas ant kito
    variants.emotion = {};
    for (const e of ['think', 'happy', 'encourage']) {
      const im = makeImg(charImg(id, e));
      im.classList.add('rig-var');
      variants.emotion[e] = im;
      top.content.append(im);
      imgs.push(im);
    }
  }
  container.append(root);

  // ---------- paveikslėlių perjungimas (tik opacity) ----------
  function show(group, name) {
    const g = variants[group];
    if (!g) return;
    const pick = g[name] ? name : Object.keys(g)[0];
    for (const [k, im] of Object.entries(g)) im.classList.toggle('on', k === pick);
  }
  const has = (lid) => !!nodes[lid];
  const stateMouth = () => (state === 'think' && variants.mouth?.o ? 'o' : 'smile');
  // galvojant akys žvelgia aukštyn (jei yra eyes_up.webp); vienkartinio judesio metu – į žiūrovą
  const stateEyes = () => (state === 'think' && !playing && variants.eyes?.up ? 'up' : 'open');

  // ---------- animacijų registras ----------
  const idleAnims = new Set();
  const actAnims = new Set();
  const timers = new Set();
  let destroyed = false;

  function anim(el, frames, opts, set) {
    if (!el || destroyed) return null;
    const a = el.animate(frames, { fill: 'none', ...opts });
    set.add(a);
    const done = () => set.delete(a);
    a.onfinish = done;
    a.oncancel = done;
    if (paused && set === idleAnims) a.pause();
    return a;
  }
  const later = (ms, fn) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!destroyed) fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const stopIdle = () => idleAnims.forEach((a) => a.cancel());
  const stopAct = () => actAnims.forEach((a) => a.cancel());

  // ---------- mirksėjimas (veikia visada, net su reduced-motion) ----------
  function scheduleBlink() {
    if (!variants.eyes?.closed) return;
    later(rand(2000, 5000), () => {
      if (!paused) blink(Math.random() < 0.2);
      scheduleBlink();
    });
  }
  function blink(double) {
    show('eyes', 'closed');
    later(120, () => {
      show('eyes', stateEyes());
      if (double) later(140, () => blink(false));
    });
  }

  // ---------- nuolatinės būsenos ----------
  let state = initialState;
  function startState() {
    stopIdle();
    show('mouth', stateMouth());
    show('eyes', stateEyes());
    if (!rigged) show('emotion', FALLBACK_IMG[state]);
    if (reduced()) return;
    const loop = { iterations: Infinity, direction: 'alternate', easing: EASE.soft };

    if (!rigged) {
      // visas paveikslėlis: lengvas siūbavimas ir pakilimas, be mastelio
      const tilt = state === 'think' ? 4 * tune.tilt : 1.2 * tune.tilt;
      const base = state === 'think' ? 2 : 0;
      anim(top.idle, [{ transform: `translateY(0) rotate(${base - tilt / 2}deg)` }, { transform: `translateY(-1.2%) rotate(${base + tilt / 2}deg)` }], { duration: sp(rand(1700, 2100)), ...loop }, idleAnims);
      return;
    }

    // kūnas "kvėpuoja" apie pėdas (tik kūno sluoksnis; squash: 0 išjungia)
    if (has('body') && tune.squash > 0) {
      const s = 0.02 * tune.squash;
      anim(nodes.body.idle, [{ transform: 'scaleY(1)' }, { transform: `scaleY(${1 + s})` }], { duration: sp(1500), ...loop }, idleAnims);
    }
    // galva: idle – vos siūbuoja kitu ritmu; think – pakrypusi 6–10° (Ona ~15°)
    if (has('head')) {
      const k = tune.tilt;
      const frames =
        state === 'think'
          ? [{ transform: `rotate(${6 * k * tune.think}deg)` }, { transform: `rotate(${10 * k * tune.think}deg)` }]
          : [{ transform: `rotate(${-2 * k}deg)` }, { transform: `rotate(${2 * k}deg)` }];
      anim(nodes.head.idle, frames, { duration: sp(state === 'think' ? 2300 : 1850), ...loop }, idleAnims);
    }
    // uodega ir ausys lėtai siūbuoja
    if (has('tail')) {
      const a = 6 * tune.tail;
      anim(nodes.tail.idle, [{ transform: `rotate(${-a}deg)` }, { transform: `rotate(${a}deg)` }], { duration: sp(1250), ...loop }, idleAnims);
    }
    for (const e of ['ears', 'ear_left', 'ear_right']) {
      if (has(e)) anim(nodes[e].idle, [{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }], { duration: sp(rand(1400, 1700)), ...loop }, idleAnims);
    }
    // rankos (sparnai): ramiai; think – viena ranka pakelta prie smakro
    const chinArm = has('arm_right') ? 'arm_right' : has('arm_left') ? 'arm_left' : null;
    for (const arm of ['arm_left', 'arm_right']) {
      if (!has(arm)) continue;
      const sign = arm === 'arm_left' ? -1 : 1;
      if (state === 'think' && arm === chinArm) {
        anim(nodes[arm].idle, [{ transform: `rotate(${-sign * 32}deg)` }, { transform: `rotate(${-sign * 36}deg)` }], { duration: sp(1600), ...loop }, idleAnims);
      } else {
        anim(nodes[arm].idle, [{ transform: `rotate(${sign * -1.5}deg)` }, { transform: `rotate(${sign * 1.5}deg)` }], { duration: sp(rand(1700, 2100)), ...loop }, idleAnims);
      }
    }
  }

  // Tado ausys kartais trūktelėja
  function scheduleEarTwitch() {
    if (!tune.earTwitch) return;
    const ear = ['ear_left', 'ear_right', 'ears'].find(has);
    if (!ear) return;
    later(rand(3000, 7000), () => {
      if (!paused && !reduced()) anim(nodes[ear].act, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)', offset: 0.3 }, { transform: 'rotate(4deg)', offset: 0.6 }, { transform: 'rotate(0)' }], { duration: 380, easing: EASE.out }, actAnims);
      scheduleEarTwitch();
    });
  }

  function setState(s) {
    if (s !== 'idle' && s !== 'think') return;
    state = s;
    if (!playing) startState();
  }

  // ---------- vienkartiniai judesiai ----------
  let playing = null;

  function play(name) {
    stopAct();
    playing?.resolve();
    let resolve;
    const done = new Promise((r) => (resolve = r));
    playing = { name, resolve };
    const finish = () => {
      if (playing?.resolve !== resolve) return;
      playing = null;
      show('mouth', stateMouth());
      show('eyes', stateEyes());
      if (!rigged) show('emotion', FALLBACK_IMG[state]);
      resolve();
    };

    if (!rigged && FALLBACK_IMG[name]) show('emotion', FALLBACK_IMG[name]);
    show('eyes', stateEyes());
    if (name === 'happy') show('mouth', 'open');
    if (name === 'encourage') show('mouth', 'smile');

    const dur = sp(name === 'happy' ? 1200 : name === 'encourage' ? 1400 : 550);
    if (reduced()) {
      later(Math.min(dur, 700), finish);
      return done;
    }
    const o = { duration: dur, easing: 'linear' };
    const runs = [];
    const add = (a) => a && runs.push(a.finished.catch(() => {}));

    if (name === 'happy') {
      const up = 8 * tune.bounce;
      const r = rigged ? 0 : -3; // atsarginis variantas: be mastelio, tik lengvas pasisukimas šuolio metu
      add(anim(top.act, [
        { transform: 'translateY(0) rotate(0)', easing: EASE.out },
        { transform: 'translateY(1.5%) rotate(0)', offset: 0.18, easing: EASE.out },
        { transform: `translateY(${-up}%) rotate(${r}deg)`, offset: 0.45, easing: EASE.in },
        { transform: 'translateY(0) rotate(0)', offset: 0.72, easing: EASE.out },
        { transform: `translateY(${-up * 0.18}%) rotate(0)`, offset: 0.85, easing: EASE.in },
        { transform: 'translateY(0) rotate(0)' },
      ], o, actAnims));
      if (has('body') && tune.squash > 0) {
        const q = tune.squash;
        const sc = (x, y) => `scale(${1 + (x - 1) * q}, ${1 + (y - 1) * q})`;
        add(anim(nodes.body.act, [
          { transform: sc(1, 1), easing: EASE.out },
          { transform: sc(1.05, 0.92), offset: 0.18, easing: EASE.out },
          { transform: sc(0.97, 1.05), offset: 0.45, easing: EASE.soft },
          { transform: sc(1, 1), offset: 0.7, easing: EASE.out },
          { transform: sc(1.03, 0.97), offset: 0.78, easing: EASE.out },
          { transform: sc(1, 1) },
        ], o, actAnims));
      }
      const flaps = Math.max(1, tune.flaps || 1);
      for (const arm of ['arm_left', 'arm_right']) {
        if (!has(arm)) continue;
        const a = arm === 'arm_left' ? -60 : 60;
        const frames = [{ transform: 'rotate(0)' }];
        for (let k = 0; k < flaps; k++) {
          frames.push({ transform: `rotate(${a}deg)`, offset: 0.2 + (k / flaps) * 0.45 });
          if (k < flaps - 1) frames.push({ transform: `rotate(${a * 0.4}deg)`, offset: 0.2 + ((k + 0.5) / flaps) * 0.45 });
        }
        frames.push({ transform: `rotate(${a}deg)`, offset: 0.7 }, { transform: 'rotate(0)' });
        add(anim(nodes[arm].act, frames, { duration: dur, easing: EASE.soft }, actAnims));
      }
      if (has('tail')) {
        const slap = tune.tailSlap ? 28 : 10;
        add(anim(nodes.tail.act, [{ transform: 'rotate(0)' }, { transform: `rotate(${slap}deg)`, offset: 0.55 }, { transform: 'rotate(-6deg)', offset: 0.75 }, { transform: 'rotate(0)' }], { duration: dur, easing: EASE.out }, actAnims));
      }
    } else if (name === 'encourage') {
      if (!rigged) {
        add(anim(top.act, [
          { transform: 'rotate(0)' },
          { transform: 'rotate(-4deg)', offset: 0.25 },
          { transform: 'rotate(4deg)', offset: 0.55 },
          { transform: 'rotate(-2deg)', offset: 0.8 },
          { transform: 'rotate(0)' },
        ], { duration: dur, easing: EASE.soft }, actAnims));
      }
      if (has('head')) {
        // du švelnūs linktelėjimai
        add(anim(nodes.head.act, [
          { transform: 'translateY(0) rotate(0)' },
          { transform: 'translateY(2.5%) rotate(3deg)', offset: 0.2 },
          { transform: 'translateY(0) rotate(0)', offset: 0.4 },
          { transform: 'translateY(2.5%) rotate(3deg)', offset: 0.6 },
          { transform: 'translateY(0) rotate(0)', offset: 0.8 },
          { transform: 'translateY(0) rotate(0)' },
        ], { duration: dur, easing: EASE.soft }, actAnims));
      }
      if (has('body')) {
        add(anim(nodes.body.act, [{ transform: 'rotate(0)' }, { transform: 'rotate(2.5deg)', offset: 0.3 }, { transform: 'rotate(2.5deg)', offset: 0.7 }, { transform: 'rotate(0)' }], { duration: dur, easing: EASE.soft }, actAnims));
      }
      const wave = has('arm_right') ? 'arm_right' : has('arm_left') ? 'arm_left' : null;
      if (wave) {
        const s = wave === 'arm_left' ? -1 : 1;
        add(anim(nodes[wave].act, [
          { transform: 'rotate(0)' },
          { transform: `rotate(${s * 50}deg)`, offset: 0.2 },
          { transform: `rotate(${s * 30}deg)`, offset: 0.35 },
          { transform: `rotate(${s * 50}deg)`, offset: 0.5 },
          { transform: `rotate(${s * 30}deg)`, offset: 0.65 },
          { transform: `rotate(${s * 45}deg)`, offset: 0.8 },
          { transform: 'rotate(0)' },
        ], { duration: dur, easing: EASE.soft }, actAnims));
      }
    } else if (name === 'wiggle') {
      // paliestas veikėjas: galva (arba visas paveikslėlis) pasisuka kairėn–dešinėn
      const el = has('head') ? nodes.head.act : top.act;
      add(anim(el, [{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)', offset: 0.25 }, { transform: 'rotate(6deg)', offset: 0.55 }, { transform: 'rotate(-3deg)', offset: 0.8 }, { transform: 'rotate(0)' }], { duration: dur, easing: EASE.soft }, actAnims));
    }
    Promise.all(runs).then(finish);
    // Atsarga: judesys visada baigiasi laiku, net jei animacijų laikrodis būtų sustojęs.
    later(dur + 120, finish);
    return done;
  }

  // ---------- kalbėjimas ----------
  let talkToken = 0;
  /** src: trukmė ms, HTMLMediaElement arba Promise (kalba, kol neišsipildo). */
  function talk(src) {
    const my = ++talkToken;
    let over = false;
    const end = () => {
      if (my !== talkToken) return;
      over = true;
    };
    if (typeof src === 'number') later(src, end);
    else if (src && typeof src.then === 'function') src.then(end, end);
    else if (src && 'paused' in src) {
      src.addEventListener('ended', end, { once: true });
      src.addEventListener('pause', end, { once: true });
    } else return;

    const headCh = has('head') ? nodes.head.talk : top.talk;
    let open = false;
    const step = () => {
      if (destroyed || my !== talkToken) return;
      if (over) {
        show('mouth', playing?.name === 'happy' ? 'open' : stateMouth());
        return;
      }
      open = !open;
      show('mouth', open ? 'open' : 'smile');
      if (!reduced() && (open || !variants.mouth)) {
        // galva (ar visas paveikslėlis) vos pastebimai juda kartu
        anim(headCh, [{ transform: 'translateY(0)' }, { transform: `translateY(${rigged ? 0.6 : 0.8}%) rotate(${rand(-1, 1)}deg)` }, { transform: 'translateY(0)' }], { duration: 160, easing: EASE.soft }, actAnims);
      }
      later(rand(80, 180), step);
    };
    step();
  }

  // ---------- pristabdymas (paslėptas ekranas / už matomos srities) ----------
  let paused = false;
  let offscreen = false;
  function syncPause() {
    const p = document.hidden || offscreen;
    if (p === paused) return;
    paused = p;
    idleAnims.forEach((a) => (p ? a.pause() : a.play()));
  }
  const onVis = () => syncPause();
  document.addEventListener('visibilitychange', onVis);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => ((offscreen = !e.isIntersecting), syncPause())) : null;
  io?.observe(root);

  // ---------- paleidimas: pirmiausia užkraunam visas dalis (be mirgėjimo) ----------
  // Kiekviena dalis: laukiam, kol atsisiųs, o iškodavimui duodam iki 150 ms (kai kur decode() vėluoja,
  // kol puslapis nepiešiamas). Atsarga: veikėjas bet kokiu atveju pasirodo po 1 s.
  const loaded = (im) =>
    im.complete
      ? Promise.resolve()
      : new Promise((r) => {
          im.addEventListener('load', r, { once: true });
          im.addEventListener('error', r, { once: true });
        });
  const partReady = (im) =>
    loaded(im).then(() => Promise.race([im.decode ? im.decode().catch(() => {}) : null, new Promise((r) => setTimeout(r, 150))]));
  const decoded = Promise.all(imgs.map(partReady));
  let started = false;
  const ready = Promise.race([decoded, new Promise((r) => setTimeout(r, 1000))]).then(() => {
    if (destroyed || started) return;
    started = true;
    root.style.opacity = '';
    root.classList.add('rig-ready');
    startState();
    scheduleBlink();
    scheduleEarTwitch();
  });

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    instances.delete(api);
    stopIdle();
    stopAct();
    timers.forEach(clearTimeout);
    timers.clear();
    document.removeEventListener('visibilitychange', onVis);
    io?.disconnect();
    root.remove();
  }

  const api = {
    el: root,
    id,
    rigged,
    config: cfg,
    ready,
    get state() {
      return state;
    },
    setState,
    play,
    talk,
    destroy,
    /** Rig redaktoriui: sluoksnio kanalai. */
    node: (lid) => nodes[lid],
    nodes,
    top,
  };
  instances.add(api);
  return api;
}
