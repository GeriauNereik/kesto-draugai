import { wait, pulse } from '../ui/dom.js';
import { randomPraise } from '../config/phrases.js';
import { stop } from '../audio.js';
import { sfx } from '../sfx.js';
import { burst } from '../ui/fx.js';

export const NEXT_DELAY = 1200; // mažiausiai tiek laukiam po teisingo atsakymo
export const SFX_GAP = 260; // balsas prabyla tik nuskambėjus efektui
const MAX_WAIT = 3500; // ilgiau nelaukiam, net jei frazė ilga

export const INTRO_PAUSE = 600; // tyla po užduoties paaiškinimo, prieš pasirodant užduočiai (kai laukiama visos frazės)
export const INTRO_MAX = 700; // ilgiau nelaukiam – užduotis pasirodo, o paaiškinimas skamba toliau

/**
 * Užduoties paaiškinimas: veikėjas pasako, ką daryti. Užduotis pasirodo ne vėliau kaip po INTRO_MAX,
 * paaiškinimas tuo metu skamba toliau. full: true – laukti visos frazės ir pauzės (kai užduotis
 * pati prabyla ir nutrauktų paaiškinimą, pvz. raidės).
 * Grąžina false, jei žaidėjas spėjo išeiti iš žaidimo.
 */
export async function intro(shell, round, key, { full = false } = {}) {
  shell.char.setEmotion('think');
  const spoken = shell.char.speak(key);
  if (full) {
    await spoken;
    await wait(INTRO_PAUSE);
  } else {
    await Promise.race([spoken, wait(INTRO_MAX)]);
  }
  return round.alive;
}

/** Laukia, kol baigsis pagyrimas (bet ne trumpiau nei NEXT_DELAY ir ne ilgiau nei MAX_WAIT). */
export function afterPraise(spoken) {
  return Promise.race([Promise.all([wait(NEXT_DELAY), spoken]), wait(MAX_WAIT)]).then(() => wait(200));
}

/**
 * Bendra raundo logika: klaidų skaičiavimas, apsauga nuo dvigubų paspaudimų,
 * reakcijos į teisingą / neteisingą atsakymą.
 */
export function createRound(shell) {
  const r = {
    alive: true,
    busy: false,
    mistakes: 0,

    async correct(el) {
      r.busy = true;
      if (el) pulse(el, 'bounce');
      el?.classList.add('correct');
      sfx('correct');
      burst(el);
      shell.char.setEmotion('happy');
      // Anksčiau kita užduotis nutraukdavo pagyrimą po 1,2 s – dabar palaukiam, kol jis baigsis.
      await afterPraise(shell.char.speak(`phrases/${randomPraise()}`, undefined, { delay: SFX_GAP }));
      return r.alive;
    },

    /** Klaida: švelnus drebėjimas, elementas tampa neaktyvus, veikėjas padrąsina. */
    wrong(el, repeatKeys = []) {
      r.mistakes++;
      sfx('wrong');
      if (el) {
        pulse(el, 'shake');
        el.classList.add('dimmed');
        el.disabled = true;
      }
      shell.char.setEmotion('encourage');
      shell.char.speak(['phrases/bandyk_dar', ...repeatKeys], 'Beveik! Pabandyk dar kartą.', { delay: SFX_GAP });
    },

    destroy() {
      r.alive = false;
      stop();
    },
  };
  return r;
}
