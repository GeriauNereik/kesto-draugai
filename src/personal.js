// Frazių pritaikymas vaikui: vardas (šauksmininku) ir giminė.
import { currentProfile } from './storage.js';
import { vocative } from './names.js';
import { PHRASES, GENDERED } from './config/phrases.js';

/** Frazės raktas pagal vaiko lytį (saunuolis → saunuole mergaitei). */
export function phraseKey(key) {
  const p = currentProfile();
  return p?.gender === 'f' && GENDERED[key] ? GENDERED[key] : key;
}

/** Frazės tekstas su įrašytu vardu. */
export function phraseText(key) {
  return fillName(PHRASES[phraseKey(key)] ?? '');
}

export function fillName(text) {
  const p = currentProfile();
  const voc = p ? vocative(p.name, p.gender) : '';
  return voc ? text.replaceAll('{vardas}', voc) : text.replace(/,?\s*\{vardas\}/g, '');
}
