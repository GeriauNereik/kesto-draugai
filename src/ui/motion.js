// Visos judesio animacijos per GSAP.
//
// Taisyklė: iliustracijų (veikėjų) NEDIDINAM ir NESPAUDŽIAM – jokio scale / zoom.
// Jos juda tik erdvėje: poslinkis (x/y) ir nedidelis pasukimas, kaip popierinės figūrėlės.
// Mastelis leidžiamas tik smulkiems UI elementams (žvaigždutės, dalelės).
import { gsap } from 'gsap';

gsap.defaults({ overwrite: 'auto' });

export const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);

const MOTIONS = {
  // Teisingas atsakymas: pašoka ir nusileidžia su atšokimu
  bounce: (el) =>
    gsap.timeline().to(el, { y: -12, duration: 0.16, ease: 'power2.out' }).to(el, { y: 0, duration: 0.55, ease: 'bounce.out' }),
  // Veikėjas džiaugiasi: aukštesnis šuolis su lengvu pasisukimu
  hop: (el) =>
    gsap
      .timeline()
      .to(el, { y: -18, rotation: -4, duration: 0.2, ease: 'power2.out', transformOrigin: '50% 100%' })
      .to(el, { y: 0, rotation: 0, duration: 0.6, ease: 'bounce.out' }),
  // Klaida: švelnus drebėjimas į šonus
  shake: (el) => gsap.fromTo(el, { x: 0 }, { keyframes: { x: [0, -9, 8, -5, 3, 0] }, duration: 0.42, ease: 'none' }),
  // Paliestas veikėjas: pasisuka kairėn-dešinėn
  wiggle: (el) =>
    gsap.fromTo(el, { rotation: 0 }, { keyframes: { rotation: [0, -7, 6, -3, 0] }, duration: 0.55, ease: 'none', transformOrigin: '50% 90%' }),
  // Padrąsinimas: pakreipia galvą
  tilt: (el) =>
    gsap.fromTo(el, { rotation: 0 }, { keyframes: { rotation: [0, -8, 3, 0] }, duration: 0.7, ease: 'power1.inOut', transformOrigin: '50% 90%' }),
  // Kalbos burbulas: įslysta iš veikėjo pusės
  'bubble-pop': (el) => gsap.fromTo(el, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'back.out(2)' }),
  // Kortelė paspausta: įsispaudžia žemyn ir atšoka (be suspaudimo)
  squish: (el) => gsap.timeline().to(el, { y: 5, duration: 0.08 }).to(el, { y: 0, duration: 0.4, ease: 'back.out(3)' }),
  // Stiklainis / skaičiukas: mažas šuoliukas
  bump: (el) => gsap.timeline().to(el, { y: -6, duration: 0.1 }).to(el, { y: 0, duration: 0.35, ease: 'bounce.out' }),
  // Progreso juosta: lapelis juostos gale pašoka
  'progress-bump': (el) => {
    const knob = el.querySelector('.progress-knob');
    if (knob) gsap.timeline().to(knob, { y: -10, duration: 0.15 }).to(knob, { y: 0, duration: 0.45, ease: 'bounce.out' });
  },
};

/** Vienkartinė reakcija (pakeičia buvusias CSS klases). */
export function pulse(el, name) {
  if (!el || reduced()) return;
  MOTIONS[name]?.(el);
}

const ENTER = {
  // Atsiranda kildamas iš apačios
  rise: { y: 28, autoAlpha: 0, ease: 'power3.out', duration: 0.5 },
  // UI plytelės (raidės, skaičiai): iššoka. Raidės – ne iliustracijos, joms mastelis tinka.
  pop: { y: 20, scale: 0.85, autoAlpha: 0, ease: 'back.out(1.8)', duration: 0.45 },
  // Rąsteliai atrieda iš kairės
  roll: { x: -70, rotation: -200, autoAlpha: 0, ease: 'power2.out', duration: 0.6 },
  // Poros kortelės "išdalinamos" iš viršaus su pasisukimu
  deal: { y: -60, rotation: () => rand(-12, 12), autoAlpha: 0, ease: 'power3.out', duration: 0.5 },
};

/** Vaikai pasirodo po vieną. Grąžina tą patį konteinerį (kad būtų patogu įterpti). */
export function stagger(container, step = 70, start = 0, kind = 'pop') {
  const kids = [...container.children];
  if (!kids.length) return container;
  if (reduced()) return container;
  gsap.from(kids, {
    ...ENTER[kind],
    delay: start / 1000,
    stagger: step / 1000,
    clearProps: 'transform,opacity,visibility',
  });
  return container;
}

/** Ramus "gyvenimas": veikėjas lėtai sūpuojasi aukštyn-žemyn. Be mastelio. */
export function idle(el, { amp = 4, rot = 1.5 } = {}) {
  if (!el || reduced()) return null;
  gsap.set(el, { transformOrigin: '50% 100%' });
  return gsap
    .timeline({ repeat: -1, yoyo: true, delay: rand(0, 0.8) })
    .to(el, { y: -amp, rotation: rot, duration: rand(1.6, 2.2), ease: 'sine.inOut' })
    .to(el, { y: 0, rotation: -rot, duration: rand(1.6, 2.2), ease: 'sine.inOut' });
}

/** Šokinėjimas vietoje (Tadas, rezultatas). times: kiek kartų (-1 – be galo). */
export function jump(el, { times = -1, height = 22, every = 1.2 } = {}) {
  if (!el || reduced()) return null;
  const up = 0.32;
  return gsap
    .timeline({ repeat: times < 0 ? -1 : times - 1, repeatDelay: Math.max(0, every - up * 2 - 0.2) })
    .to(el, { y: -height, duration: up, ease: 'power2.out' })
    .to(el, { y: 0, duration: up, ease: 'power2.in' })
    .to(el, { y: -4, duration: 0.1, ease: 'power1.out' })
    .to(el, { y: 0, duration: 0.1, ease: 'power1.in' });
}

/** Pavadinimo raidės banguoja viena po kitos. */
export function wave(chars) {
  if (reduced()) return null;
  return gsap.timeline({ repeat: -1, repeatDelay: 1.6 }).to(chars, {
    keyframes: { y: [0, -10, 0] },
    duration: 0.6,
    ease: 'sine.inOut',
    stagger: 0.07,
  });
}

/** Žvaigždutės iššoka po vieną (UI ikonos – joms mastelis tinka). onEach – garsas, pliūpsnis. */
export function popStars(stars, { delay = 0.35, each = 0.3, onEach } = {}) {
  if (reduced()) {
    stars.forEach((s, i) => onEach?.(s, i));
    return;
  }
  const tl = gsap.timeline({ delay });
  stars.forEach((star, i) => {
    tl.from(star, { scale: 0, rotation: -120, autoAlpha: 0, duration: 0.5, ease: 'back.out(2.2)' }, i * each);
    // Garsas – atskiru laikmačiu: jis turi nuskambėti, net jei animacijos stringa (taupymo režimas ir pan.).
    setTimeout(() => onEach?.(star, i), (delay + i * each) * 1000);
  });
}

/** Elementas atsiranda (pvz. "+3 ★", "Naujas rekordas!"). */
export function appear(el, delay = 0) {
  if (!el || reduced()) return;
  gsap.from(el, { y: 16, autoAlpha: 0, duration: 0.45, delay, ease: 'back.out(2)' });
}

/** Naujas ekranas įslysta. */
export function screenIn(el) {
  if (!el || reduced()) return;
  gsap.from(el, { autoAlpha: 0, y: 12, duration: 0.35, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
}

/** Sustabdo visas animacijas ekrano viduje (prieš jį išmetant). */
export function killWithin(root) {
  gsap.killTweensOf(root.querySelectorAll('*'));
}

export { gsap };
