// Progresas tik localStorage. Visi kreipiniai apsaugoti try/catch.
//
// Struktūra:
// { settings: { sound }, current: profileId,
//   profiles: [{ id, name, gender: 'm'|'f', avatar, stars: { game: { level: n } }, jar, seenJar, played }] }
//   stars  – geriausias rezultatas kiekviename lygyje (rodoma kortelėse)
//   jar    – visos kada nors surinktos žvaigždutės (auga po kiekvieno žaidimo)
const KEY = 'miskiniai.v1';
// Pakeitus šią žymą, kiekviename įrenginyje vieną kartą išvalomi visų žaidėjų rezultatai
// (žvaigždutės, stiklainis, sužaistų žaidimų skaičius). Vardai, avatarai ir nustatymai lieka.
const RESULTS_RESET = '2026-10-18';
const clearResults = (p) => ({ ...p, stars: {}, jar: 0, seenJar: 0, played: 0, draw: {} });
const DEFAULT_SETTINGS = { sound: true };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === 'object') {
      const reset = data.resultsReset !== RESULTS_RESET;
      return {
        // Ona tapo vedle – jos avatarą turėję profiliai gauna Vėją.
        profiles: (Array.isArray(data.profiles) ? data.profiles : [])
          .map((p) => (p.avatar === 'ona' ? { ...p, avatar: 'veja' } : p))
          .map((p) => (reset ? clearResults(p) : p)),
        resultsReset: RESULTS_RESET,
        current: data.current ?? null,
        settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
        // Senoji versija (be profilių): žvaigždutės atiteks pirmam sukurtam profiliui.
        legacy: reset ? null : data.legacy || (data.stars && !data.profiles ? { stars: data.stars, played: data.played || 0 } : null),
      };
    }
  } catch {
    /* privatus režimas ar sugadinti duomenys */
  }
  return { profiles: [], current: null, settings: { ...DEFAULT_SETTINGS }, legacy: null, resultsReset: RESULTS_RESET };
}

let state = load();
save(); // išsaugom iškart, kad nunulinimas įvyktų tik vieną kartą

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* tęsiam be išsaugojimo */
  }
}

// ---------- Profiliai ----------
export function getProfiles() {
  return state.profiles;
}

export function currentProfile() {
  return state.profiles.find((p) => p.id === state.current) || null;
}

export function setCurrentProfile(id) {
  state.current = id;
  save();
}

export function createProfile({ name, gender, avatar }) {
  const p = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    gender,
    avatar,
    stars: {},
    jar: 0,
    seenJar: 0,
    played: 0,
  };
  if (state.legacy && state.profiles.length === 0) {
    p.stars = state.legacy.stars || {};
    p.played = state.legacy.played || 0;
    state.legacy = null;
  }
  state.profiles.push(p);
  state.current = p.id;
  save();
  return p;
}

export function updateProfile(id, patch) {
  const p = state.profiles.find((x) => x.id === id);
  if (!p) return;
  Object.assign(p, patch);
  save();
}

export function deleteProfile(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  if (state.current === id) state.current = state.profiles[0]?.id ?? null;
  save();
}

// ---------- Žvaigždutės ----------
export function getStars(gameId, level, profile = currentProfile()) {
  return profile?.stars?.[gameId]?.[level] ?? 0;
}

/** Prideda žvaigždutes į "stiklainį" ir išsaugo geriausią lygio rezultatą. */
export function saveStars(gameId, level, stars) {
  const p = currentProfile();
  if (!p) return false;
  p.jar = (p.jar || 0) + stars;
  const prev = getStars(gameId, level, p);
  const best = stars > prev;
  if (best) p.stars[gameId] = { ...(p.stars[gameId] || {}), [level]: stars };
  save();
  return best;
}

/** Prideda žvaigždučių į stiklainį (pvz. už kiekvieną nupieštą piešinį). */
export function addToJar(n = 1) {
  const p = currentProfile();
  if (!p) return;
  p.jar = (p.jar || 0) + n;
  save();
}

// ---------- Piešimas ----------
// p.draw[kategorija] – jau nupieštų užduočių sąrašas (kad nesikartotų, kol nenupieštos visos).
/** Kurie piešiniai kategorijoje jau nupiešti (tekstai). Senas formatas (skaičius) – sąrašas sudaromas iš naujo. */
export function getDrawn(cat, profile = currentProfile()) {
  const v = profile?.draw?.[cat];
  return Array.isArray(v) ? v : [];
}

/** Kiek piešinių kategorijoje jau nupiešta. */
export function getDrawDone(cat, profile = currentProfile()) {
  return getDrawn(cat, profile).length;
}

export function setDrawn(cat, list) {
  const p = currentProfile();
  if (!p) return;
  p.draw = { ...(p.draw || {}), [cat]: list };
  save();
}

/** Stiklainio būsena: kiek iš viso ir kiek vaikas jau "matė" meniu (animacijai). */
export function jarInfo() {
  const p = currentProfile();
  return { total: p?.jar || 0, seen: p?.seenJar || 0 };
}

export function markJarSeen() {
  const p = currentProfile();
  if (!p) return;
  p.seenJar = p.jar || 0;
  save();
}

/** Padidina baigtų žaidimų skaičių. Grąžina true, jei laikas pertraukėlei. */
export function markGamePlayed() {
  const p = currentProfile();
  if (!p) return false;
  p.played = (p.played || 0) + 1;
  save();
  return p.played % 2 === 0;
}

/** Ištrina profilio žvaigždutes ir skaitiklius. Vardas ir nustatymai lieka. */
export function resetProgress(id = state.current) {
  updateProfile(id, { stars: {}, jar: 0, seenJar: 0, played: 0, draw: {} });
}

// ---------- Nustatymai ----------
export function getSetting(name) {
  return state.settings?.[name] ?? DEFAULT_SETTINGS[name];
}

export function setSetting(name, value) {
  state.settings = { ...state.settings, [name]: value };
  save();
}
