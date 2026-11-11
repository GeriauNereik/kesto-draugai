// Ar vaikas jau girdėjo žaidimo paaiškinimą (balsu). Pirmą kartą Ona paaiškina balsu,
// vėliau – tik parodo tekstą burbule (garsiakalbio mygtuku galima išklausyti vėl).
// Saugoma kiekvienam vaikui (profiliui) atskirai.
import { currentProfile } from './storage.js';

const KEY = 'kd-heard';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

const who = () => currentProfile()?.id || 'anon';

/** true – jau girdėjo; pirmą kartą pažymi kaip girdėtą ir grąžina false. */
export function heardBefore(phraseKey) {
  const all = load();
  const list = all[who()] || [];
  if (list.includes(phraseKey)) return true;
  all[who()] = [...list, phraseKey];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* privatus režimas – tiesiog kalbės kiekvieną kartą */
  }
  return false;
}
