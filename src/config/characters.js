// Visi veikėjai vienoje vietoje: vardus ir failų kelius keisk čia.
const BASE = `${import.meta.env.BASE_URL}assets/characters/`;

export const EMOTIONS = ['think', 'happy', 'encourage'];

// Ona – pagrindinė vedlė (kalba tuo pačiu moterišku balsu kaip visi įrašai), todėl
// jos negalima pasirinkti avataru ir ji nenaudojama „Porų“ žaidime.
export const MAIN_GUIDE = 'ona';

export const CHARACTERS = {
  ona: { name: 'Pelėda Ona', short: 'Ona', file: 'peleda', role: 'vedlė' },
  domas: { name: 'Ežys Domas', short: 'Domas', file: 'domas', role: 'raidės' },
  kestas: { name: 'Bebras Kęstas', short: 'Kęstas', file: 'kestas', role: 'skaičiai' },
  veja: { name: 'Voverė Vėja', short: 'Vėja', file: 'vovere', role: 'poros' },
  tadas: { name: 'Stirniukas Tadas', short: 'Tadas', file: 'elnias', role: 'judesio pertraukėlė' },
  gedas: { name: 'Gandras Gedas', short: 'Gedas', file: 'gandras', role: 'miško draugas' },
};

/** Veikėjai, kuriuos galima rodyti kaip draugus (avatarai, porų kortelės) – visi, išskyrus vedlę. */
export const FRIENDS = Object.keys(CHARACTERS).filter((id) => id !== MAIN_GUIDE);

/** Grąžina veikėjo paveikslėlio URL. */
export function charImg(id, emotion = 'think') {
  const c = CHARACTERS[id];
  if (!c) throw new Error(`Nežinomas veikėjas: ${id}`);
  return `${BASE}${c.file}_${emotion}.webp`;
}

/** Portretas iš rig dalių (npm run portraits) – avatarams, porų kortelėms, profiliams. */
export function charPortrait(id) {
  if (!CHARACTERS[id]) throw new Error(`Nežinomas veikėjas: ${id}`);
  return `${BASE}portraits/${id}.webp`;
}

// Miško daiktai porų kortelėms (public/assets/characters/items/).
export const ITEMS = ['gile', 'musmire', 'kankorezis', 'obuolys', 'lapas', 'braske', 'lizdas', 'ramune', 'sraige'];
export function itemImg(id) {
  return `${BASE}items/${id}.webp`;
}

/** Visi portretai (išankstiniam užkrovimui). */
export function allPortraits() {
  return [...Object.keys(CHARACTERS).map(charPortrait), ...ITEMS.map(itemImg)];
}
