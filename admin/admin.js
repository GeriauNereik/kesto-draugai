// Tėvų panelė: kiekvieno įrenginio žaidėjai – kiek laiko žaidė, ką veikė; užraktas su kodu ir žinute.
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getFirestore, collection, doc, onSnapshot, query, orderBy, limit, documentId, updateDoc, deleteField, deleteDoc,
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
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat().filter((k) => k != null && k !== false));
  return e;
};

const DAYS = 7;
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const lastDays = () => Array.from({ length: DAYS }, (_, i) => dayKey(new Date(Date.now() - i * 864e5)));
const dur = (sec) => {
  const m = Math.round((sec || 0) / 60);
  return m < 60 ? `${m} min.` : `${Math.floor(m / 60)} val. ${m % 60} min.`;
};
const time = (t) => new Date(t).toLocaleString('lt-LT', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const ago = (t) => {
  if (!t) return 'dar niekada';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return 'ką tik';
  if (m < 60) return `prieš ${m} min.`;
  if (m < 1440) return `prieš ${Math.round(m / 60)} val.`;
  return time(t);
};
const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(Math.max(0, 3 - (n || 0)));

function describe(e) {
  const secs = e.d ? ` · ${Math.floor(e.d / 60)}:${String(e.d % 60).padStart(2, '0')}` : '';
  switch (e.k) {
    case 'game':
      return e.f ? `Nepavyko: ${e.n} (${e.l} lygis)${secs}` : `Sužaidė: ${e.n} (${e.l} lygis) ${stars(e.s)}${secs}`;
    case 'quit':
      return `Išėjo nebaigęs: ${e.n} (${e.l} lygis)${secs}`;
    case 'draw':
      return `Nupiešė: ${e.n}`;
    case 'unlock':
      return 'Atrakino kodu';
    default:
      return e.k;
  }
}

// ---------- Prisijungimas ----------
$('#login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  $('#login-error').hidden = true;
  try {
    await signInWithEmailAndPassword(auth, f.get('email'), f.get('password'));
  } catch (e) {
    $('#login-error').textContent = 'Nepavyko prisijungti – patikrink el. paštą ir slaptažodį.';
    $('#login-error').hidden = false;
  }
});
$('#logout').addEventListener('click', () => signOut(auth));

let unsubs = [];
onAuthStateChanged(auth, (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];
  $('#devices').replaceChildren();
  const ok = user && user.email === ADMIN_EMAIL;
  $('#login').hidden = !!ok;
  $('#logout').hidden = !user;
  if (user && !ok) {
    $('#login-error').textContent = `Ši paskyra (${user.email}) nėra admin.`;
    $('#login-error').hidden = false;
  }
  if (ok) watchDevices();
});

// ---------- Įrenginiai ----------
const cards = new Map(); // uid -> { card, device, days }

function watchDevices() {
  unsubs.push(
    onSnapshot(
      query(collection(db, 'devices'), orderBy('lastSeen', 'desc')),
      (snap) => {
        const seen = new Set();
        snap.forEach((d) => {
          seen.add(d.id);
          let c = cards.get(d.id);
          if (!c) {
            c = { device: null, days: {} };
            cards.set(d.id, c);
            unsubs.push(
              onSnapshot(query(collection(db, 'devices', d.id, 'days'), orderBy(documentId(), 'desc'), limit(DAYS)), (ds) => {
                c.days = {};
                ds.forEach((x) => (c.days[x.id] = x.data()));
                render(d.id);
              })
            );
          }
          c.device = d.data();
          render(d.id);
        });
        for (const id of [...cards.keys()]) if (!seen.has(id)) cards.delete(id);
        const root = $('#devices');
        root.replaceChildren(...[...cards.values()].map((c) => c.el).filter(Boolean));
        if (!cards.size) root.replaceChildren(el('p', { class: 'card muted' }, 'Dar nė vienas įrenginys neprisijungė. Atsidaryk žaidimą telefone (su internetu).'));
      },
      (err) => $('#devices').replaceChildren(el('p', { class: 'card error' }, `Klaida: ${err.message}`))
    )
  );
}

function render(uid) {
  const c = cards.get(uid);
  const dev = c.device || {};
  const profiles = dev.profiles || {};
  const locks = dev.locks || {};
  const unlocked = dev.unlocked || {};
  const days = lastDays();

  const lockBox = (key, label) => {
    const l = locks[key];
    const active = l && (unlocked[key] || 0) < l.at;
    const code = el('input', { inputmode: 'numeric', pattern: '[0-9]*', maxlength: 8, placeholder: 'Kodas', value: active ? l.code : '' });
    const msg = el('input', { placeholder: 'Žinutė, pvz. Ar šiandien šėrei katę?', value: active ? l.msg || '' : '' });
    const status = active
      ? el('p', { class: 'lock-status on' }, `Užrakinta nuo ${time(l.at)}`)
      : l
        ? el('p', { class: 'lock-status' }, `Atrakinta ${unlocked[key] ? `(kodas suvestas)` : ''}`)
        : null;
    const set = async () => {
      const v = code.value.replace(/\D/g, '');
      if (v.length < 3) return code.focus();
      await updateDoc(doc(db, 'devices', uid), { [`locks.${key}`]: { code: v, msg: msg.value.trim(), at: Date.now() } });
    };
    const clear = () => updateDoc(doc(db, 'devices', uid), { [`locks.${key}`]: deleteField() });
    return el('div', { class: `lock-box${active ? ' active' : ''}` },
      el('h4', {}, label),
      status,
      el('div', { class: 'lock-row' }, code, msg),
      el('div', { class: 'lock-row' },
        el('button', { onclick: set }, active ? 'Pakeisti' : 'Užrakinti'),
        l ? el('button', { class: 'ghost', onclick: clear }, 'Nuimti užraktą') : null)
    );
  };

  const profileCard = (pid, p) => {
    const perDay = days.map((d) => ({ d, sec: c.days[d]?.p?.[pid]?.sec || 0 }));
    const week = perDay.reduce((a, x) => a + x.sec, 0);
    const max = Math.max(60, ...perDay.map((x) => x.sec));
    const events = days
      .flatMap((d) => c.days[d]?.p?.[pid]?.ev || [])
      .sort((a, b) => b.t - a.t)
      .slice(0, 40);
    return el('section', { class: 'profile' },
      el('div', { class: 'p-head' },
        el('h3', {}, p.name || pid),
        el('p', { class: 'muted' }, `Šiandien ${dur(perDay[0].sec)} · per 7 d. ${dur(week)}`)),
      el('div', { class: 'bars' }, perDay.slice().reverse().map((x) =>
        el('div', { class: 'bar', title: `${x.d}: ${dur(x.sec)}` },
          el('span', { style: `height:${Math.round((x.sec / max) * 100)}%` }),
          el('small', {}, x.d.slice(5))))),
      el('details', { open: true },
        el('summary', {}, `Veikla (${events.length})`),
        events.length
          ? el('ul', { class: 'events' }, events.map((e) => el('li', {}, el('time', {}, time(e.t)), ' ', describe(e))))
          : el('p', { class: 'muted' }, 'Per 7 dienas veiklos nėra.')),
      lockBox(pid, `Užraktas: ${p.name || pid}`)
    );
  };

  const card = el('article', { class: 'card device' },
    el('div', { class: 'd-head' },
      el('h2', {}, dev.device || 'Įrenginys'),
      el('p', { class: 'muted' }, `Paskutinį kartą matytas ${ago(dev.lastSeen)}`)),
    Object.keys(profiles).length
      ? Object.entries(profiles).map(([pid, p]) => profileCard(pid, p))
      : el('p', { class: 'muted' }, 'Žaidėjų dar nėra.'),
    lockBox('*', 'Užraktas visiems šio įrenginio žaidėjams'),
    el('button', {
      class: 'ghost danger',
      onclick: () => {
        if (window.confirm(`Pašalinti „${dev.device || 'Įrenginys'}“ iš sąrašo? (Jei juo vėl bus žaidžiama, jis atsiras iš naujo.)`)) deleteDoc(doc(db, 'devices', uid));
      },
    }, 'Pašalinti įrenginį iš sąrašo')
  );
  // Neperpiešiam, kol tėvai rašo kodą ar žinutę.
  if (c.el && c.el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  if (c.el?.isConnected) c.el.replaceWith(card);
  c.el = card;
}
