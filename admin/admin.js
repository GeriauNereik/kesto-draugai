// Admin panelė: visi telefonai su įdiegta programėle (iki ~10). Kiekvienam – būsena, žaista laiko, veikla,
// pavadinimas ir užraktas su kodu; taip pat kodas visiems iš karto. Naujas telefonas atsiranda iškart.
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getFirestore, collection, doc, onSnapshot, query, where, documentId, updateDoc, deleteField, deleteDoc, getDocs, FieldPath,
} from 'firebase/firestore';
import { FIREBASE, ADMIN_EMAIL } from '../src/sync/config.js';

const app = initializeApp(FIREBASE);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat().filter((k) => k != null && k !== false));
  return e;
};

// ---------- Formatavimas ----------
const DAYS = 7;
const WEEKS_KEPT = 8; // kiek savaičių atgal galima peržiūrėti
const ONLINE = 150_000; // programėlė atsiliepia kas minutę, kol atidaryta
const NEW = 24 * 3600_000;
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Lietuvoje savaitė – nuo pirmadienio iki sekmadienio.
function monday(offsetWeeks = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offsetWeeks * 7);
  return d;
}
/** Savaitės dienos (pirmadienis…sekmadienis); 0 – ši savaitė, −1 – praėjusi ir t. t. */
function weekDays(offsetWeeks = 0) {
  const m = monday(offsetWeeks);
  return Array.from({ length: DAYS }, (_, i) => dayKey(new Date(m.getFullYear(), m.getMonth(), m.getDate() + i, 12)));
}
const WEEKDAY = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'];
let weekOffset = 0;
const shortDate = (key) => `${key.slice(5, 7)}-${key.slice(8, 10)}`;
function weekTitle(off = weekOffset) {
  if (off === 0) return 'Ši savaitė';
  if (off === -1) return 'Praėjusi savaitė';
  const d = weekDays(off);
  return `${shortDate(d[0])} – ${shortDate(d[6])}`;
}
const dur = (sec) => {
  const m = Math.round((sec || 0) / 60);
  if (!m) return '0 min.';
  return m < 60 ? `${m} min.` : `${Math.floor(m / 60)} val. ${m % 60} min.`;
};
const clock = (t) => new Date(t).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });
const when = (t) => {
  if (!t) return '–';
  const d = new Date(t);
  if (dayKey(d) === dayKey(new Date())) return `šiandien ${clock(t)}`;
  if (dayKey(d) === dayKey(new Date(Date.now() - 864e5))) return `vakar ${clock(t)}`;
  return d.toLocaleString('lt-LT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const ago = (t) => {
  if (!t) return 'dar nematytas';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return 'ką tik';
  if (m < 60) return `prieš ${m} min.`;
  if (m < 1440) return `prieš ${Math.round(m / 60)} val.`;
  return when(t);
};
const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(Math.max(0, 3 - (n || 0)));
function describe(e) {
  const secs = e.d ? ` · ${Math.floor(e.d / 60)}:${String(e.d % 60).padStart(2, '0')}` : '';
  switch (e.k) {
    case 'game':
      return e.f ? `Nepavyko: ${e.n}, ${e.l} lygis${secs}` : `${e.n}, ${e.l} lygis ${stars(e.s)}${secs}`;
    case 'quit':
      return `Išėjo nebaigęs: ${e.n}, ${e.l} lygis${secs}`;
    case 'draw':
      return `Nupiešė: ${e.n}`;
    case 'run':
      return `${e.n}: ${e.p} tšk.${secs}`;
    case 'unlock':
      return '🔓 Atrakino kodu';
    default:
      return e.k;
  }
}

/** Užrakto būsena: aktyvus užraktas (bet kuris raktas) arba paskutinis atrakinimas. */
function lockInfo(dev) {
  const locks = dev.locks || {};
  const unlocked = dev.unlocked || {};
  const active = Object.entries(locks).find(([k, l]) => l?.code && (unlocked[k] || 0) < l.at);
  if (active) return { on: true, key: active[0], ...active[1] };
  const last = Object.entries(locks).filter(([k]) => unlocked[k]).sort((a, b) => unlocked[b[0]] - unlocked[a[0]])[0];
  return { on: false, unlockedAt: last ? unlocked[last[0]] : 0 };
}

// ---------- Būsena ----------
const devices = new Map(); // uid -> { data, days: { 'YYYY-MM-DD': {...} }, unsub }
const open = new Set(); // išskleistos „Veikla“ dalys
const drafts = new Map(); // uid -> { code, msg } – kad perpiešiant neprapultų įvestas tekstas
let firstLoad = true;
let unsubs = [];

// ---------- Prisijungimas ----------
$('#login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  $('#login-error').hidden = true;
  try {
    await signInWithEmailAndPassword(auth, f.get('email'), f.get('password'));
  } catch {
    $('#login-error').textContent = 'Nepavyko prisijungti – patikrink el. paštą ir slaptažodį.';
    $('#login-error').hidden = false;
  }
});
$('#logout').addEventListener('click', () => signOut(auth));

// ?demo – pavyzdiniai duomenys be prisijungimo (išvaizdai peržiūrėti; mygtukai nieko nekeičia).
const DEMO = new URLSearchParams(location.search).has('demo');
if (DEMO) setTimeout(demo, 0);
else onAuthStateChanged(auth, (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];
  devices.forEach((d) => d.unsub?.());
  devices.clear();
  firstLoad = true;
  const ok = user && user.email === ADMIN_EMAIL;
  $('#login').hidden = !!ok;
  $('#app').hidden = !ok;
  $('#logout').hidden = !user;
  $('#summary').textContent = '';
  if (user && !ok) {
    $('#login-error').textContent = `Paskyra ${user.email} neturi admin teisių.`;
    $('#login-error').hidden = false;
  }
  if (ok) watch();
});

function watch() {
  unsubs.push(
    onSnapshot(
      // Be orderBy: kitaip įrenginiai be lastSeen būtų nematomi (rikiuojam piešiant).
      collection(db, 'devices'),
      (snap) => {
        const seen = new Set();
        snap.forEach((d) => {
          seen.add(d.id);
          let entry = devices.get(d.id);
          if (!entry) {
            entry = { data: null, days: {} };
            devices.set(d.id, entry);
            entry.unsub = onSnapshot(
              // Paskutinės WEEKS_KEPT savaitės: id >= seniausio pirmadienio (didėjanti tvarka – nereikia papildomo indekso)
              query(collection(db, 'devices', d.id, 'days'), where(documentId(), '>=', weekDays(-(WEEKS_KEPT - 1))[0])),
              (ds) => {
                entry.days = {};
                ds.forEach((x) => (entry.days[x.id] = x.data()));
                render();
              },
              (err) => note(`Nepavyko gauti statistikos: ${err.message}`, true)
            );
            if (!firstLoad) note(`Prisijungė naujas telefonas: ${d.data().device || 'įrenginys'}`);
          }
          entry.data = d.data();
        });
        for (const [id, e] of devices) {
          if (!seen.has(id)) {
            e.unsub?.();
            devices.delete(id);
          }
        }
        firstLoad = false;
        render();
      },
      (err) => {
        $('#devices').replaceChildren(el('p', { class: 'error' }, `Klaida: ${err.message}`));
      }
    )
  );
  // Kas 30 s atnaujinam „prieš 3 min.“, „prisijungęs“ ir pan.
  const t = setInterval(render, 30_000);
  unsubs.push(() => clearInterval(t));
}

// ---------- Savaitės perjungimas ----------
function weekNav() {
  const prev = el('button', { class: 'ghost wk-btn', 'aria-label': 'Ankstesnė savaitė', disabled: weekOffset <= -(WEEKS_KEPT - 1) || null, onclick: () => ((weekOffset -= 1), render()) }, '‹');
  const next = el('button', { class: 'ghost wk-btn', 'aria-label': 'Kita savaitė', disabled: weekOffset >= 0 || null, onclick: () => ((weekOffset += 1), render()) }, '›');
  const d = weekDays(weekOffset);
  return el('div', { class: 'week-nav' }, prev, el('span', {}, el('b', {}, weekTitle()), el('small', {}, ` ${shortDate(d[0])} – ${shortDate(d[6])}`)), next);
}

function note(text, error = false) {
  const n = $('#bulk-note');
  n.textContent = text;
  n.classList.toggle('bad', error);
  n.hidden = false;
  n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  clearTimeout(note.t);
  note.t = setTimeout(() => (n.hidden = true), 6000);
}

/** Veiksmas su Firebase: pavykus – pranešimas, nepavykus – klaida (o ne tyla). */
async function act(fn, ok) {
  try {
    await fn();
    if (ok) note(ok);
  } catch (e) {
    console.error(e);
    note(`Nepavyko: ${e.code === 'permission-denied' ? 'nėra teisių (ar prisijungta admin paskyra?)' : e.message}`, true);
  }
}
const CODE_HINT = 'Kodas turi būti iš 3–8 skaitmenų.';

// ---------- Kodas visiems ----------
// Raktas '*' – „visi šio telefono žaidėjai“ (tekstiniame kelyje '*' neleidžiamas, todėl FieldPath).
const ALL = new FieldPath('locks', '*');
$('#bulk').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const code = String(f.get('code') || '').replace(/\D/g, '');
  if (code.length < 3) return note(CODE_HINT, true);
  if (!devices.size) return note('Telefonų dar nėra.');
  const lock = { code, msg: String(f.get('msg') || '').trim(), at: Date.now() };
  // Kiekvienas atskirai – jei vienas telefonas ką tik pašalintas, kiti vis tiek užrakinami.
  await act(() => eachDevice((id) => updateDoc(doc(db, 'devices', id), ALL, lock)), `Užrakinta telefonų: ${devices.size}. Kodas ${code}.`);
});
$('#bulk-clear').addEventListener('click', async () => {
  if (!devices.size) return;
  await act(() => eachDevice((id) => updateDoc(doc(db, 'devices', id), { locks: deleteField() })), 'Užraktai nuimti visiems telefonams.');
});

/** Veiksmas visiems telefonams; klaida – tik jei nepavyko nė vienam. */
async function eachDevice(fn) {
  const res = await Promise.allSettled([...devices.keys()].map(fn));
  const bad = res.filter((r) => r.status === 'rejected');
  if (bad.length === res.length && bad.length) throw bad[0].reason;
}

/** Pašalina telefoną kartu su jo dienų statistika (kitaip senos dienos „prisikeltų“). */
async function removeDevice(uid) {
  const days = await getDocs(collection(db, 'devices', uid, 'days'));
  await Promise.all(days.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'devices', uid));
}

// ---------- Vienas telefonas ----------
const setLock = (uid, code, msg) => updateDoc(doc(db, 'devices', uid), ALL, { code, msg, at: Date.now() });
const clearLock = (uid) => updateDoc(doc(db, 'devices', uid), { locks: deleteField() });
const rename = (uid, label) => updateDoc(doc(db, 'devices', uid), { label: label ? label : deleteField() });

function deviceRow(uid, entry) {
  const dev = entry.data || {};
  const days = weekDays(weekOffset);
  const profiles = Object.entries(dev.profiles || {});
  const sec = (d, pid) => entry.days[d]?.p?.[pid]?.sec || 0;
  const daySec = (d) => profiles.reduce((a, [pid]) => a + sec(d, pid), 0) || Object.values(entry.days[d]?.p || {}).reduce((a, x) => a + (x.sec || 0), 0);
  const today = daySec(dayKey(new Date()));
  const week = days.reduce((a, d) => a + daySec(d), 0);
  const online = dev.lastSeen && Date.now() - dev.lastSeen < ONLINE;
  const isNew = dev.firstSeen && Date.now() - dev.firstSeen < NEW;
  const lock = lockInfo(dev);
  const name = dev.label || dev.device || 'Įrenginys';
  const draft = drafts.get(uid) || { code: lock.on ? lock.code : '', msg: lock.on ? lock.msg || '' : '' };

  const code = el('input', {
    'data-id': `${uid}:code`, inputmode: 'numeric', pattern: '[0-9]*', maxlength: 8, placeholder: 'Kodas', 'aria-label': 'Kodas', value: draft.code,
    oninput: (e) => drafts.set(uid, { ...draft, ...drafts.get(uid), code: e.target.value }),
  });
  const msg = el('input', {
    'data-id': `${uid}:msg`, placeholder: 'Žinutė (nebūtina)', 'aria-label': 'Žinutė', value: draft.msg,
    oninput: (e) => drafts.set(uid, { ...draft, ...drafts.get(uid), msg: e.target.value }),
  });
  const submit = async (ev) => {
    ev.preventDefault();
    const v = code.value.replace(/\D/g, '');
    if (v.length < 3) {
      note(CODE_HINT, true);
      return code.focus();
    }
    drafts.delete(uid);
    await act(() => setLock(uid, v, msg.value.trim()), `Užrakinta: ${dev.label || dev.device || 'telefonas'}, kodas ${v}.`);
  };
  const label = el('input', {
    'data-id': `${uid}:label`, class: 'name-input', value: dev.label || '', placeholder: dev.device || 'Įrenginys', 'aria-label': 'Telefono pavadinimas', title: 'Spausk ir pervadink',
    onchange: (e) => act(() => rename(uid, e.target.value.trim())),
    onkeydown: (e) => e.key === 'Enter' && e.target.blur(),
  });

  const row = el('article', { class: `device${lock.on ? ' locked' : ''}`, 'data-uid': uid },
    el('div', { class: 'd-main' },
      el('div', { class: 'd-name' },
        el('span', { class: `dot${online ? ' on' : ''}`, title: online ? 'Programėlė atidaryta' : 'Neprisijungęs' }),
        label,
        isNew ? el('span', { class: 'badge new' }, 'Naujas') : null,
        el('span', { class: 'muted small' }, dev.label ? dev.device || '' : '')),
      el('div', { class: 'd-stats' },
        el('span', {}, el('b', {}, profiles.length ? profiles.map(([, p]) => p.name).join(', ') : 'Žaidėjų dar nėra')),
        el('span', {}, 'Šiandien ', el('b', {}, dur(today))),
        el('span', {}, `${weekOffset === 0 ? 'Šią savaitę' : weekTitle()}: `, el('b', {}, dur(week))),
        el('span', { class: 'muted' }, online ? 'Atidaryta dabar' : `Matytas ${ago(dev.lastSeen)}`))),
    el('div', { class: 'd-lock' },
      lock.on
        ? el('span', { class: 'pill on' }, `🔒 Užrakinta · ${lock.code}`, lock.msg ? el('small', {}, `„${lock.msg}“`) : null)
        : el('span', { class: 'pill' }, lock.unlockedAt ? `🔓 Atrakinta ${when(lock.unlockedAt)}` : '🔓 Atrakinta'),
      el('form', { class: 'lock-form', onsubmit: submit },
        code, msg,
        el('button', { type: 'submit' }, lock.on ? 'Pakeisti' : 'Užrakinti'),
        lock.on ? el('button', { type: 'button', class: 'ghost', onclick: () => act(() => clearLock(uid), 'Užraktas nuimtas.') }, 'Nuimti') : null)),
    el('details', { class: 'd-more', open: open.has(uid) || null, ontoggle: (e) => (e.target.open ? open.add(uid) : open.delete(uid)) },
      el('summary', {}, 'Veikla ir statistika'),
      details(uid, entry, days, profiles, daySec))
  );
  return row;
}

function details(uid, entry, days, profiles, daySec) {
  const max = Math.max(60, ...days.map(daySec));
  const events = days
    .flatMap((d) => Object.entries(entry.days[d]?.p || {}).flatMap(([pid, x]) => (x.ev || []).map((e) => ({ ...e, who: entry.data?.profiles?.[pid]?.name || '' }))))
    .sort((a, b) => b.t - a.t)
    .slice(0, 60);
  return el('div', { class: 'more' },
    el('div', { class: 'bars', 'aria-label': `Žaista: ${weekTitle()}` }, days.map((d, i) => {
      const s = daySec(d);
      const wd = WEEKDAY[i];
      const future = d > dayKey(new Date());
      const isToday = d === dayKey(new Date());
      return el('div', { class: `bar${future ? ' future' : ''}${isToday ? ' today' : ''}`, title: `${d}: ${dur(s)}` },
        el('em', {}, s ? `${Math.round(s / 60)}` : ''),
        el('span', { style: `height:${Math.round((s / max) * 100)}%` }),
        el('small', {}, wd));
    })),
    events.length
      ? el('ul', { class: 'events' }, events.map((e) => el('li', {},
          el('time', {}, when(e.t)),
          profiles.length > 1 && e.who ? el('b', {}, e.who) : null,
          el('span', {}, describe(e)))))
      : el('p', { class: 'muted' }, `${weekTitle()}: veiklos nėra.`),
    el('button', {
      class: 'ghost danger',
      onclick: () => window.confirm('Pašalinti šį telefoną iš sąrašo? Jei programėlė vėl bus atidaryta, jis atsiras iš naujo.') && act(() => removeDevice(uid), 'Telefonas pašalintas iš sąrašo.'),
    }, 'Pašalinti iš sąrašo')
  );
}

// ---------- Piešimas ----------
// Kol pelė nuspausta ant sąrašo (ir trumpai po to), neperpiešiam – kitaip mygtukas būtų pakeistas
// nauju dar prieš „click“, ir paspaudimas dingtų.
let holdUntil = 0;
document.addEventListener('pointerdown', (e) => $('#devices').contains(e.target) && (holdUntil = Infinity), true);
// Baigus rašyti laukelyje – perpiešiam ir tą telefoną (jo duomenys galėjo pasikeisti).
document.addEventListener('focusout', (e) => e.target.tagName === 'INPUT' && $('#devices').contains(e.target) && setTimeout(render, 450), true);
const release = () => holdUntil !== 0 && ((holdUntil = Date.now() + 400), setTimeout(render, 450));
document.addEventListener('pointerup', release, true);
document.addEventListener('pointercancel', release, true); // slenkant liečiamu ekranu ateina cancel, ne up
function render() {
  if (Date.now() < holdUntil) return;
  // Telefonas, kurio laukelyje admin dabar rašo, neperpiešiamas (kitaip dingtų žymeklis) –
  // visi kiti atsinaujina iškart. Anksčiau sustodavo visa panelė, kol laukelis buvo aktyvus.
  const a = document.activeElement;
  const editing = a && a.tagName === 'INPUT' && $('#devices').contains(a) ? a.closest('.device') : null;
  const list = [...devices.entries()].filter(([, e]) => e.data).sort(([, a], [, b]) => (b.data.lastSeen || 0) - (a.data.lastSeen || 0));
  const online = list.filter(([, e]) => Date.now() - (e.data.lastSeen || 0) < ONLINE).length;
  const locked = list.filter(([, e]) => lockInfo(e.data).on).length;
  $('#summary').textContent = `${list.length} telefonai · ${online} atidaryti · ${locked} užrakinti`;
  $('#list-count').replaceChildren(weekNav());
  const box = $('#devices');
  if (editing && editing.isConnected) {
    // Redaguojant – keičiam eilutes po vieną, redaguojamos neliečiam (kitaip dingtų fokusas).
    const keep = new Set(list.map(([uid]) => uid));
    box.querySelectorAll('.device').forEach((r) => !keep.has(r.dataset.uid) && r !== editing && r.remove());
    for (const [uid, e] of list) {
      const old = box.querySelector(`.device[data-uid="${uid}"]`);
      if (old === editing) continue;
      const row = deviceRow(uid, e);
      if (old) old.replaceWith(row);
      else box.append(row);
    }
    return;
  }
  box.replaceChildren(
    ...(list.length
      ? list.map(([uid, e]) => deviceRow(uid, e))
      : [el('p', { class: 'empty' }, 'Telefonų dar nėra. Atidarius programėlę telefone (su internetu), jis atsiras čia iškart.')])
  );
}

function demo() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  const now = Date.now();
  const days = Array.from({ length: DAYS }, (_, i) => dayKey(new Date(now - i * 864e5))); // šiandien ir 6 ankstesnės
  const ev = (t, k, n, l, st, d) => ({ t, k, n, l, s: st, d });
  const mk = (data, perDay) => ({ data, days: Object.fromEntries(days.map((d, i) => [d, { p: perDay(i) }])) });
  devices.set('a', mk(
    { device: 'iPhone', label: 'Kęsto iPhone', lastSeen: now - 40_000, firstSeen: now - 9 * 864e5, profiles: { p1: { name: 'Kęstas' } } },
    (i) => ({ p1: { sec: [1260, 600, 0, 2400, 900, 300, 1500][i], ev: i ? [] : [ev(now - 300_000, 'game', 'Laikrodis', 2, 3, 95), ev(now - 900_000, 'draw', 'katę'), ev(now - 1_500_000, 'quit', 'Debesėliai', 1, 0, 40)] } })
  ));
  devices.set('b', mk(
    { device: 'iPad', lastSeen: now - 3 * 3600_000, firstSeen: now - 5 * 864e5, profiles: { p2: { name: 'Ona' }, p3: { name: 'Jonas' } }, locks: { '*': { code: '4821', msg: 'Ar šiandien šėrei katę?', at: now - 3600_000 } } },
    (i) => ({ p2: { sec: [600, 0, 1200, 0, 0, 600, 0][i], ev: i ? [] : [ev(now - 4 * 3600_000, 'game', 'Surask poras', 3, 2, 120)] }, p3: { sec: [300, 300, 0, 0, 900, 0, 0][i] } })
  ));
  devices.set('c', mk({ device: 'iPhone', lastSeen: now - 20_000, firstSeen: now - 600_000, profiles: {} }, () => ({})));
  render();
  setInterval(render, 1500); // kaip tikri atnaujinimai iš telefonų – kad matytųsi, jog rašymas ir mygtukai netrukdomi
}
