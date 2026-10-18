// Ryšys su Firebase be SDK (tik REST) – kad programėlė liktų lengva.
// Įrenginys prisijungia anonimiškai; jo dokumentas: devices/{uid}
//   profiles: { pid: { name, avatar } }      – žaidėjai šiame įrenginyje
//   locks:    { pid | '*': { code, msg, at } } – rašo TIK admin (užraktas su kodu)
//   unlocked: { pid | '*': at }               – įrenginys pažymi, kad užraktas atrakintas
//   lastSeen, device
// Dienų statistika: devices/{uid}/days/{YYYY-MM-DD}
//   p.{pid}.sec – žaista sekundžių; p.{pid}.ev – veiksmai [{t, k, g, l, s, x}]
import { FIREBASE } from './config.js';

const AUTH_KEY = 'kd.cloud.auth';
// Vietiniai bandymai (localhost) į admin panelę nesiunčiami – kad ten būtų tik tikri telefonai.
// Prireikus išbandyti sinchronizaciją vietoje: pridėti ?sync prie adreso.
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|.*\.local)$/.test(location.hostname) && !/[?&]sync\b/.test(location.search);
export const enabled = !!FIREBASE.apiKey && !LOCAL;
const DOCS = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;

let auth = read(AUTH_KEY); // { uid, idToken, refreshToken, exp }

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
function write(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* be išsaugojimo */
  }
}

async function post(url, body, form = false) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' },
    body: form ? new URLSearchParams(body) : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Galiojantis žetonas (prireikus – naujas anoniminis prisijungimas arba atnaujinimas). */
async function token() {
  if (auth && auth.exp > Date.now() + 60_000) return auth.idToken;
  const key = FIREBASE.apiKey;
  if (auth?.refreshToken) {
    try {
      const r = await post(`https://securetoken.googleapis.com/v1/token?key=${key}`, { grant_type: 'refresh_token', refresh_token: auth.refreshToken }, true);
      auth = { uid: r.user_id, idToken: r.id_token, refreshToken: r.refresh_token, exp: Date.now() + Number(r.expires_in) * 1000 };
      write(AUTH_KEY, auth);
      return auth.idToken;
    } catch {
      /* sugadintas – registruojamės iš naujo */
    }
  }
  const r = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, { returnSecureToken: true });
  auth = { uid: r.localId, idToken: r.idToken, refreshToken: r.refreshToken, exp: Date.now() + Number(r.expiresIn) * 1000 };
  write(AUTH_KEY, auth);
  return auth.idToken;
}

async function api(path, { method = 'GET', body } = {}) {
  const t = await token();
  const r = await fetch(`${DOCS}${path}`, {
    method,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ---------- Firestore reikšmių konvertavimas ----------
export function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
}
export function fromValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  return null;
}

/** Įrenginio dokumentas (užraktai ir pan.). */
export async function getDevice() {
  await token();
  const d = await api(`/devices/${auth.uid}`);
  return d ? fromValue({ mapValue: { fields: d.fields || {} } }) : {};
}

/** Atnaujina nurodytus įrenginio laukus (taškiniai keliai, pvz. 'profiles.p1', 'unlocked.p1'). */
export async function patchDevice(fields) {
  await token();
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k.split('.').map((s) => `\`${s}\``).join('.'))}`)
    .join('&');
  // Taškinius kelius paverčiam įdėtiniais objektais.
  const nested = {};
  for (const [path, v] of Object.entries(fields)) {
    const parts = path.split('.');
    let o = nested;
    parts.slice(0, -1).forEach((p) => (o = o[p] = o[p] || {}));
    o[parts[parts.length - 1]] = v;
  }
  const body = { fields: toValue(nested).mapValue.fields };
  return api(`/devices/${auth.uid}?${mask}`, { method: 'PATCH', body });
}

/** Dienos statistika: pridedam sekundes ir veiksmus kiekvienam žaidėjui (atominiai prieaugiai). */
export async function pushDay(day, perProfile) {
  await token();
  const name = `projects/${FIREBASE.projectId}/databases/(default)/documents/devices/${auth.uid}/days/${day}`;
  const transforms = [];
  for (const [pid, { sec, ev }] of Object.entries(perProfile)) {
    if (sec) transforms.push({ fieldPath: `p.${pid}.sec`, increment: { integerValue: String(Math.round(sec)) } });
    if (ev?.length) transforms.push({ fieldPath: `p.${pid}.ev`, appendMissingElements: { values: ev.map(toValue) } });
  }
  if (!transforms.length) return;
  const t = await token();
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    // update su tuščia kauke + transformacijos: dokumentas sukuriamas, jei jo dar nėra
    body: JSON.stringify({ writes: [{ update: { name, fields: {} }, updateMask: { fieldPaths: [] }, updateTransforms: transforms }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}
