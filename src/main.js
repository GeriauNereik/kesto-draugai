// Miškiniai: ekranų jungiklis (be URL maršrutų) ir garso atrakinimas.
// Baloo 2: apvalus, draugiškas, turi visas lietuviškas raides (Fredoka jų neturi).
import '@fontsource/baloo-2/latin-500.css';
import '@fontsource/baloo-2/latin-ext-500.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-ext-700.css';
import '@fontsource/titan-one/latin-400.css';
import '@fontsource/titan-one/latin-ext-400.css';
import './style.css';

import { unlockAudio, preload, stop, setMuted } from './audio.js';
import { setupPwa } from './pwa.js';
import { allPortraits } from './config/characters.js';
import { allRigImgs } from './character/rig-config.js';
import { PHRASES } from './config/phrases.js';
import { starsFor, nextLevel } from './config/games.js';
import { saveStars, markGamePlayed, getSetting, getProfiles, currentProfile, setCurrentProfile } from './storage.js';
import { decor } from './ui/decor.js';
import { killWithin, screenIn } from './ui/motion.js';
import { clearFx } from './ui/fx.js';
import { destroyWithin } from './character/character.js';

import { startScreen } from './screens/start.js';
import { menuScreen, resetGreeting } from './screens/menu.js';
import { onboardingScreen } from './screens/onboarding.js';
import { profilesScreen } from './screens/profiles.js';
import { levelScreen } from './screens/level.js';
import { resultScreen } from './screens/result.js';
import { breakScreen } from './screens/break.js';
import { parentsScreen } from './screens/parents.js';
import { lettersGame } from './games/letters.js';
import { countingGame } from './games/counting.js';
import { memoryGame } from './games/memory.js';
import { mathGame } from './games/math.js';
import { cloudsGame } from './games/clouds.js';
import { clockGame } from './games/clock.js';
import { grade2Game } from './games/grade2.js';
import { tictactoeGame } from './games/tictactoe.js';
import { drawGame } from './games/draw.js';
import { hubScreen } from './screens/hub.js';

const GAME_MODULES = {
  letters: lettersGame,
  counting: countingGame,
  math: mathGame,
  clouds: cloudsGame,
  clock: clockGame,
  memory: memoryGame,
  grade2: grade2Game,
  tictactoe: tictactoeGame,
  draw: drawGame,
};

const app = document.getElementById('app');
let cleanup = null;
let breakDue = false;

/** Perjungia ekraną: išvalo ankstesnį ir piešia naują. */
function show(render, params = {}) {
  stop();
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  killWithin(app);
  destroyWithin(app);
  clearFx();
  app.replaceChildren();
  cleanup = render(app, params) || null;
  screenIn(app.firstElementChild);
  app.scrollTop = 0;
}

/** Jei laikas pertraukėlei, pirmiau parodo Tadą, tada tęsia. */
function thenMaybeBreak(go) {
  if (!breakDue) return go();
  breakDue = false;
  show(breakScreen, { onDone: go });
}

const screens = {
  start() {
    show(startScreen, {
      onStart() {
        unlockAudio(); // privalo būti paspaudimo apdorojime (iOS)
        preload(Object.keys(PHRASES).map((k) => `phrases/${k}`));
        screens.home();
      },
    });
  },
  /** Kur eiti po "Pradėti": pažintis, žaidėjo pasirinkimas arba iškart meniu. */
  home() {
    const list = getProfiles();
    if (!list.length) return screens.onboarding();
    if (list.length > 1) return screens.profiles();
    if (!currentProfile()) setCurrentProfile(list[0].id);
    screens.menu();
  },
  onboarding() {
    const canGoBack = getProfiles().length > 0;
    show(onboardingScreen, {
      onBack: canGoBack ? screens.profiles : null,
      onDone: () => {
        resetGreeting();
        screens.menu({ firstTime: true });
      },
    });
  },
  profiles() {
    show(profilesScreen, {
      onPicked: () => {
        resetGreeting();
        screens.menu();
      },
      onNew: screens.onboarding,
    });
  },
  menu({ firstTime = false } = {}) {
    if (!currentProfile()) return screens.home();
    show(menuScreen, {
      firstTime,
      onPick: (game) => (game.hub ? screens.hub(game) : screens.level(game)),
      onParents: screens.parents,
      onSwitch: screens.profiles,
    });
  },
  parents() {
    show(parentsScreen, { onHome: screens.menu });
  },
  hub(hub) {
    show(hubScreen, { hub, onHome: screens.menu, onPick: (game) => screens.level(game) });
  },
  /** Kur grįžti iš žaidimo: į jo skiltį (pvz. Matematika) arba į meniu. */
  back(game) {
    return game.parent ? () => screens.hub(game.parent) : screens.menu;
  },
  level(game) {
    show(levelScreen, { game, onHome: screens.back(game), onLevel: (level) => screens.game(game, level) });
  },
  game(game, level) {
    show(GAME_MODULES[game.id], {
      level,
      onHome: () => screens.level(game),
      onFinish({ mistakes = 0, stars, failed = false }) {
        breakDue = markGamePlayed();
        if (failed) return screens.result(game, level, 0, false, true);
        const starCount = stars ?? starsFor(mistakes);
        const isBest = saveStars(game.id, level, starCount);
        screens.result(game, level, starCount, isBest);
      },
    });
  },
  result(game, level, starCount, isBest, failed = false) {
    const next = failed ? null : nextLevel(game, level);
    show(resultScreen, {
      game,
      starCount,
      isBest,
      failed,
      onAgain: () => thenMaybeBreak(() => screens.game(game, level)),
      onNext: next ? () => thenMaybeBreak(() => screens.game(game, next)) : null,
      onMenu: () => thenMaybeBreak(screens.back(game)),
    });
  },
};

// Visų veikėjų dalis ir portretus užkraunam ir iškoduojam iš anksto (fone, po pirmo ekrano),
// kad kituose ekranuose veikėjai pasirodytų iškart, be laukimo.
const warm = () => {
  for (const src of [...allRigImgs(), ...allPortraits()]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    img.decode?.().catch(() => {});
  }
};
if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 1500 });
else setTimeout(warm, 300);

// Ilgo paspaudimo meniu ir dvigubo bakstelėjimo priartinimas iOS.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

setMuted(!getSetting('sound'));
document.body.prepend(decor());
screens.start();

// Atnaujinimai (įdiegtoje programėlėje): žr. src/pwa.js
setupPwa();
