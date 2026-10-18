// Veikėjų rig'ų konfigūracija: src/rigs/{id}.json + build metu surinktas dalių sąrašas.
//
// Jei veikėjo aplanke public/assets/rigs/{id}/ yra dalių, bet JSON dar nėra – konfigūracija
// sudaroma automatiškai pagal failų vardus su numatytais sukimosi taškais (juos patikslinti
// galima rig redaktoriumi: npm run dev → /rig-editor.html).
import { RIG_FILES } from 'virtual:rig-manifest';

const CONFIGS = import.meta.glob('../rigs/*.json', { eager: true, import: 'default' });

// Gili kopija (structuredClone yra tik nuo iOS 15.4).
const clone = (x) => JSON.parse(JSON.stringify(x));

export const RIG_BASE = `${import.meta.env.BASE_URL}assets/rigs/`;

// Numatyti sukimosi taškai (drobės dalimis 0–1) ir tėvai pagal dalies pavadinimą.
// Tvarka = piešimo tvarka (pirmas – apačioje).
const DEFAULTS = [
  { id: 'tail', file: 'tail.webp', pivot: [0.35, 0.75], parent: 'body' },
  { id: 'arm_left', file: 'arm_left.webp', pivot: [0.38, 0.55], parent: 'body' },
  { id: 'leg_left', file: 'leg_left.webp', pivot: [0.44, 0.78], parent: 'body' },
  { id: 'leg_right', file: 'leg_right.webp', pivot: [0.56, 0.78], parent: 'body' },
  { id: 'body', file: 'body.webp', pivot: [0.5, 0.95] },
  { id: 'head', file: 'head.webp', pivot: [0.5, 0.55], parent: 'body' },
  { id: 'ears', file: 'ears.webp', pivot: [0.5, 0.3], parent: 'head' },
  { id: 'ear_left', file: 'ear_left.webp', pivot: [0.4, 0.3], parent: 'head' },
  { id: 'ear_right', file: 'ear_right.webp', pivot: [0.6, 0.3], parent: 'head' },
  { id: 'eyes', files: { open: 'eyes_open.webp', closed: 'eyes_closed.webp', up: 'eyes_up.webp' }, parent: 'head' },
  { id: 'mouth', files: { smile: 'mouth_smile.webp', open: 'mouth_open.webp', o: 'mouth_o.webp' }, parent: 'head' },
  { id: 'arm_right', file: 'arm_right.webp', pivot: [0.62, 0.55], parent: 'body' },
];

export const DEFAULT_TUNING = { bounce: 1, tilt: 1, speed: 1, squash: 1, think: 1, tail: 1, flaps: 0, tailSlap: 0, earTwitch: 0 };

// Veikėjų ypatumai – numatytosios reikšmės, kurias JSON "tuning" gali perrašyti.
export const PERSONALITY = {
  gedas: { bounce: 0.7, flaps: 2 },
  domas: { squash: 1.4 },
  kestas: { tailSlap: 1 },
  ona: { think: 1.8, flaps: 1 },
  veja: { tail: 2.2 },
  tadas: { earTwitch: 1 },
};

/** Galutinis tuning: numatytieji → veikėjo ypatumai → JSON. */
export function effectiveTuning(id, json = {}) {
  return { ...DEFAULT_TUNING, ...PERSONALITY[id], ...json };
}

/** Ar veikėjas turi bent privalomas dalis (kūną ir galvą). */
export function hasRig(id) {
  const files = RIG_FILES[id] || [];
  return files.includes('body.webp') && files.includes('head.webp');
}

/** Sudaro konfigūraciją numatytaisiais nustatymais iš esamų failų. */
export function autoConfig(id) {
  const files = new Set(RIG_FILES[id] || []);
  const layers = DEFAULTS.filter((l) => (l.file ? files.has(l.file) : Object.values(l.files).some((f) => files.has(f))));
  const extras = [...files].filter((f) => f.startsWith('extra_')).sort();
  for (const f of extras) layers.push({ id: f.replace(/\.webp$/, ''), file: f, pivot: [0.5, 0.5], parent: 'body' });
  return { name: id, canvas: 1024, layers: clone(layers), tuning: {} };
}

/**
 * Galutinė konfigūracija: JSON (jei yra) arba automatinė; dalys, kurių failų nėra, praleidžiamos.
 * override – rig redaktoriui (neišsaugota konfigūracija).
 */
export function rigConfig(id, override) {
  const base = clone(override || CONFIGS[`../rigs/${id}.json`] || autoConfig(id));
  const files = new Set(RIG_FILES[id] || []);
  base.tuning = base.tuning || {};
  base.layers = base.layers
    .map((l) => {
      if (l.file) return files.has(l.file) ? l : null;
      const present = Object.fromEntries(Object.entries(l.files || {}).filter(([, f]) => files.has(f)));
      return Object.keys(present).length ? { ...l, files: present } : null;
    })
    .filter(Boolean);
  // Jei tėvo nėra (failas trūksta) – sluoksnis kabinamas prie šaknies.
  const ids = new Set(base.layers.map((l) => l.id));
  base.layers.forEach((l) => {
    if (l.parent && !ids.has(l.parent)) delete l.parent;
  });
  return base;
}

export function rigIds() {
  return Object.keys(RIG_FILES);
}

/** Visų žaidime naudojamų veikėjų dalių URL (be bandomųjų _aplankų) – išankstiniam užkrovimui. */
export function allRigImgs() {
  return rigIds()
    .filter((id) => !id.startsWith('_'))
    .flatMap((id) => RIG_FILES[id].map((f) => `${RIG_BASE}${id}/${f}`));
}
