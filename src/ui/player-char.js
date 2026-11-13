// Veikėjas, kuris lydi vaiką visur (meniu, skiltys, lygiai, žaidimai) – jo paties pasirinktas avataras.
// Jei žaidėjo dar nėra (pirmas paleidimas) – nurodytas atsarginis veikėjas.
import { CHARACTERS } from '../config/characters.js';
import { currentProfile } from '../storage.js';

export function playerChar(fallback = 'ona') {
  const a = currentProfile()?.avatar;
  return CHARACTERS[a] ? a : fallback;
}
