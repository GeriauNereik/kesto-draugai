// Išveda visų reikalingų garso failų sąrašą (JSON) generatoriui scripts/make_audio.py.
// Tekstai imami iš tų pačių konfigūracijų, kurias naudoja programa.
import { ALPHABET } from '../src/config/alphabet.js';
import { PHRASES } from '../src/config/phrases.js';
import { ALL_DRAW_ITEMS, drawId } from '../src/config/draw-items.js';

// Visur vienas balsas – Ona (lt-LT-OnaNeural), šiek tiek lėtesniu tempu vaikams.
const VOICE = 'ona';
const NUMBERS = ['vienas', 'du', 'trys', 'keturi', 'penki', 'šeši', 'septyni', 'aštuoni', 'devyni', 'dešimt'];

const items = [
  ...ALPHABET.map((l) => ({ file: `letters/${l.file}`, text: l.name, voice: VOICE, rate: '-25%' })),
  ...NUMBERS.map((t, i) => ({ file: `numbers/${i + 1}`, text: t, voice: VOICE, rate: '-20%' })),
  ...Object.entries(PHRASES).map(([k, t]) => ({
    file: `phrases/${k}`,
    // Vardo įrašyti negalima – frazė įrašoma be jo („Labas! Aš Ona…“).
    text: t.replace(/,?\s*\{vardas\}/g, ''),
    voice: VOICE,
    rate: '-18%',
  })),
  // Piešimo užduotys: „Nupiešk katę!“
  ...ALL_DRAW_ITEMS.map((t) => ({ file: `draw/${drawId(t)}`, text: `Nupiešk ${t}!`, voice: VOICE, rate: '-18%' })),
];
process.stdout.write(JSON.stringify(items, null, 1));
