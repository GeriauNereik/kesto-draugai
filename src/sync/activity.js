// Kas, kiek ir ką žaidė – kaupiama vietoje ir siunčiama į admin panelę (kai yra internetas).
// Taip pat tikrina užraktus: admin gali uždėti kodą (ir žinutę) konkrečiam žaidėjui arba visiems.
import { enabled, getDevice, patchDevice, pushDay } from './cloud.js';
import { currentProfile, getProfiles } from '../storage.js';

const QUEUE_KEY = 'kd.cloud.q'; // { 'YYYY-MM-DD': { pid: { sec, ev: [] } } }
const PENDING_KEY = 'kd.cloud.sending'; // siunčiama dalis – jei programėlė bus uždaryta, kitą kartą išsiųsim
const MAX_EV = 300; // veiksmų per dieną vienam žaidėjui (daugiau – seniausi išmetami)
const MAX_DAYS = 30; // kiek dienų laikom be interneto
const LOCK_KEY = 'kd.cloud.locks'; // { locks, unlocked } – paskutinė žinoma būsena (veikia ir be interneto)
const TICK = 15_000; // kas kiek skaičiuojamas žaidimo laikas
const IDLE = 45_000; // jei tiek laiko niekas neliečiama – laikas neskaičiuojamas
const FLUSH = 60_000;

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* be išsaugojimo */
  }
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let queue = read(QUEUE_KEY, {});
// Ankstesnis siuntimas nutrūko (programėlė uždaryta) – grąžinam į eilę.
mergeIntoQueue(read(PENDING_KEY, {}));
write(PENDING_KEY, {});
let lastTouch = Date.now();
let playing = false; // laikas skaičiuojamas tik žaidimo ekrane

/** main.js praneša, ar dabar rodomas žaidimas (meniu, nustatymai ir pan. – nesiskaičiuoja). */
export function setPlaying(on) {
  playing = !!on;
}

function mergeIntoQueue(part) {
  for (const [day, profs] of Object.entries(part || {})) {
    for (const [pid, b] of Object.entries(profs)) {
      const d = (queue[day] = queue[day] || {});
      const cur = (d[pid] = d[pid] || { sec: 0, ev: [] });
      cur.sec += b.sec || 0;
      cur.ev = [...(b.ev || []), ...cur.ev].slice(-MAX_EV);
    }
  }
  // Be interneto ilgai – laikom tik paskutines MAX_DAYS dienų.
  const days = Object.keys(queue).sort();
  days.slice(0, Math.max(0, days.length - MAX_DAYS)).forEach((d) => delete queue[d]);
  write(QUEUE_KEY, queue);
}
let lockState = read(LOCK_KEY, { locks: {}, unlocked: {} });
const lockListeners = new Set();

function bucket(pid) {
  const day = (queue[today()] = queue[today()] || {});
  return (day[pid] = day[pid] || { sec: 0, ev: [] });
}

/** Užregistruoja veiksmą: žaidimą, piešinį ir pan. (k – rūšis, kiti laukai trumpi, kad duomenų būtų mažai). */
export function track(ev) {
  const p = currentProfile();
  if (!p) return;
  const b = bucket(p.id);
  b.ev.push({ t: Date.now(), ...ev });
  if (b.ev.length > MAX_EV) b.ev.splice(0, b.ev.length - MAX_EV);
  write(QUEUE_KEY, queue);
}

function tick() {
  const p = currentProfile();
  if (!p || !playing || document.hidden || Date.now() - lastTouch > IDLE || isLocked()) return;
  bucket(p.id).sec += TICK / 1000;
  write(QUEUE_KEY, queue);
}

let flushing = false;
async function flush() {
  if (!enabled || flushing || !navigator.onLine) return;
  const days = Object.keys(queue);
  if (!days.length) return;
  flushing = true;
  // Siunčiama dalis laikoma atskirai, kol serveris patvirtins (kad uždarius programėlę niekas nedingtų).
  const sent = queue;
  queue = {};
  write(PENDING_KEY, sent);
  write(QUEUE_KEY, queue);
  try {
    for (const day of days) {
      try {
        await pushDay(day, sent[day]);
      } catch (e) {
        // 4xx (išskyrus 401/429) – duomenys netinkami, kartoti nėra prasmės: išmetam tą dieną.
        if (!(e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429)) throw e;
      }
      delete sent[day]; // išsiųsta – nebegrąžinsim (kitaip sekundės būtų suskaičiuotos du kartus)
      write(PENDING_KEY, sent);
    }
  } catch {
    // Nepavyko – likusias (neišsiųstas) dienas grąžinam į eilę.
    mergeIntoQueue(sent);
  } finally {
    write(PENDING_KEY, {});
    flushing = false;
  }
}

// ---------- Užraktai ----------
/** Aktyvus užraktas dabartiniam žaidėjui (arba visiems) – { key, code, msg, at } arba null. */
export function activeLock() {
  const p = currentProfile();
  const { locks = {}, unlocked = {} } = lockState;
  for (const key of [p?.id, '*']) {
    const l = key && locks[key];
    if (l && l.code && (unlocked[key] || 0) < l.at) return { key, ...l };
  }
  return null;
}
export const isLocked = () => !!activeLock();

/** Bandymas atrakinti: true, jei kodas teisingas. */
export function tryUnlock(code) {
  const l = activeLock();
  if (!l || String(code) !== String(l.code)) return false;
  lockState = { ...lockState, unlocked: { ...lockState.unlocked, [l.key]: l.at } };
  write(LOCK_KEY, lockState);
  track({ k: 'unlock' });
  if (enabled) patchDevice({ [`unlocked.${l.key}`]: l.at }).catch(() => {});
  notifyLock();
  return true;
}

export function onLockChange(fn) {
  lockListeners.add(fn);
  return () => lockListeners.delete(fn);
}
function notifyLock() {
  lockListeners.forEach((fn) => fn(activeLock()));
}

async function refresh() {
  if (!enabled || !navigator.onLine || document.hidden) return;
  try {
    const d = await getDevice();
    const unlocked = { ...(d.unlocked || {}) };
    // Vietoje atrakinta, bet dar neišsiųsta – nepamirštam.
    for (const [k, at] of Object.entries(lockState.unlocked || {})) if ((unlocked[k] || 0) < at) unlocked[k] = at;
    lockState = { locks: d.locks || {}, unlocked };
    write(LOCK_KEY, lockState);
    notifyLock();
    // Žaidėjų vardai – kad admin panelėje matytųsi, kas yra kas.
    const profiles = Object.fromEntries(getProfiles().map((p) => [p.id, { name: p.name, avatar: p.avatar || '' }]));
    const now = Date.now();
    // Atrakinta be interneto – dabar pranešam ir serveriui (kad admin matytų „Atrakinta“).
    const unsent = {};
    for (const [k, at] of Object.entries(unlocked)) if ((d.unlocked?.[k] || 0) < at) unsent[`unlocked.${k}`] = at;
    // firstSeen – kad admin panelėje naujas telefonas būtų pažymėtas „Naujas“.
    await patchDevice({ profiles, lastSeen: now, device: deviceLabel(), ...(d.firstSeen ? {} : { firstSeen: now }), ...unsent });
  } catch {
    /* be interneto – liekam su paskutine žinoma būsena */
  }
  flush();
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPad|Macintosh/.test(ua) && 'ontouchend' in document) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android';
  return 'Kompiuteris';
}

export function startActivity() {
  document.addEventListener('pointerdown', () => (lastTouch = Date.now()), { capture: true, passive: true });
  setInterval(tick, TICK);
  if (!enabled) return;
  setInterval(refresh, FLUSH);
  document.addEventListener('visibilitychange', () => (document.hidden ? flush() : refresh()));
  window.addEventListener('online', refresh);
  refresh();
}

/** Pasikeitus žaidėjui – iškart patikrinam jo užraktą. */
export function profileChanged() {
  notifyLock();
  refresh();
}
