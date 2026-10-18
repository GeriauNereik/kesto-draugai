// Kas, kiek ir ką žaidė – kaupiama vietoje ir siunčiama į admin panelę (kai yra internetas).
// Taip pat tikrina užraktus: admin gali uždėti kodą (ir žinutę) konkrečiam žaidėjui arba visiems.
import { enabled, getDevice, patchDevice, pushDay } from './cloud.js';
import { currentProfile, getProfiles } from '../storage.js';

const QUEUE_KEY = 'kd.cloud.q'; // { 'YYYY-MM-DD': { pid: { sec, ev: [] } } }
const LOCK_KEY = 'kd.cloud.locks'; // { locks, unlocked } – paskutinė žinoma būsena (veikia ir be interneto)
const TICK = 15_000; // kas kiek skaičiuojamas žaidimo laikas
const IDLE = 120_000; // jei tiek laiko niekas neliečiama – laikas neskaičiuojamas
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
let lastTouch = Date.now();
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
  bucket(p.id).ev.push({ t: Date.now(), ...ev });
  write(QUEUE_KEY, queue);
}

function tick() {
  const p = currentProfile();
  if (!p || document.hidden || Date.now() - lastTouch > IDLE || isLocked()) return;
  bucket(p.id).sec += TICK / 1000;
  write(QUEUE_KEY, queue);
}

let flushing = false;
async function flush() {
  if (!enabled || flushing || !navigator.onLine) return;
  const days = Object.keys(queue);
  if (!days.length) return;
  flushing = true;
  const sent = queue;
  queue = {};
  write(QUEUE_KEY, queue);
  try {
    for (const day of days) await pushDay(day, sent[day]);
  } catch {
    // Nepavyko – grąžinam į eilę (sujungiam su per tą laiką sukauptais).
    for (const [day, profs] of Object.entries(sent)) {
      for (const [pid, b] of Object.entries(profs)) {
        const cur = ((queue[day] = queue[day] || {})[pid] = queue[day]?.[pid] || { sec: 0, ev: [] });
        cur.sec += b.sec;
        cur.ev = [...b.ev, ...cur.ev];
      }
    }
    write(QUEUE_KEY, queue);
  } finally {
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
    await patchDevice({ profiles, lastSeen: Date.now(), device: deviceLabel() });
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
