import { h, onTap, pulse } from './dom.js';
import { CHARACTERS } from '../config/characters.js';
import { say, textFor } from '../audio.js';
import { sfx } from '../sfx.js';
import { createCharacter } from '../character/character.js';

/**
 * Veikėjas su kalbos burbulu. Burbule visada rodomas tekstas,
 * nes garso gali nebūti (nėra mp3 ir lietuviško balso).
 * Pats veikėjas – gyvas (src/character): kvėpuoja, mirksi, džiaugiasi, padrąsina ir „kalba“,
 * kol skamba jo frazė.
 */
export function character(id, { emotion = 'think', size = 'md', onTapChar } = {}) {
  const text = h('p', { class: 'bubble-text', 'aria-live': 'polite' });
  const bubble = h('div', { class: 'bubble', hidden: true }, text);
  const frame = h('div', { class: 'char-frame', 'aria-label': CHARACTERS[id].name });
  const el = h('div', { class: `character character-${size}` }, [frame, bubble]);
  const rig = createCharacter(frame, id, { state: emotion === 'think' ? 'think' : 'idle' });

  // Paliestas veikėjas visada sukrusta, net jei neturi ką pasakyti.
  onTap(frame, () => {
    sfx('tap');
    rig.play('wiggle');
    onTapChar?.();
  });

  let current = emotion;
  let seq = 0; // kiekvienas speak() gauna numerį – senesnė uždelsta frazė nebeprabyla
  const talkSay = (list) => {
    const p = say(list);
    rig.talk(p); // burna juda, kol skamba frazė
    return p;
  };
  const api = {
    el,
    rig,
    /** Senų emocijų API: think – nuolatinė būsena, happy / encourage – vienkartiniai judesiai. */
    setEmotion(e) {
      // happy / encourage – vienkartiniai: suveikia kiekvieną kartą (pvz. du teisingi atsakymai iš eilės)
      if (e === current && e === 'think') return;
      current = e;
      if (e === 'think') rig.setState('think');
      else if (e === 'happy') rig.play('happy');
      else if (e === 'encourage') rig.play('encourage');
    },
    /** Veikėjas "kalba", kol pažadas neišsipildo (pvz. say() be burbulo teksto). */
    talk(promise) {
      rig.talk(promise);
      return promise;
    },
    show(str) {
      const changed = text.textContent !== str;
      text.textContent = str;
      bubble.hidden = !str;
      if (str && changed) pulse(bubble, 'bubble-pop');
    },
    /**
     * Parodo tekstą ir ištaria. keys: raktas arba masyvas; textOverride – kitas burbulo tekstas.
     * delay (ms): tekstas rodomas iš karto, o balsas prabyla vėliau – kad nesutaptų su garso efektu.
     * Uždelsta frazė neprabils, jei ekranas jau pakeistas arba veikėjas spėjo pasakyti ką nors kita.
     */
    speak(keys, textOverride, { delay = 0 } = {}) {
      const list = Array.isArray(keys) ? keys : [keys];
      const my = ++seq;
      api.show(textOverride ?? list.map(textFor).join(' '));
      if (!delay) return talkSay(list);
      return new Promise((r) => setTimeout(r, delay)).then(() => (my === seq && el.isConnected ? talkSay(list) : undefined));
    },
  };
  return api;
}
