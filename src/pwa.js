// Atnaujinimai telefone: įdiegta programėlė (pridėta prie pradžios ekrano) nauja versija pasitikrina
// kiekvieną kartą ją atidarius ar grįžus iš fono, ir dar kas 30 min. Radus naują – persikrauna pati.
import { registerSW } from 'virtual:pwa-register';

const EVERY = 30 * 60 * 1000;

let pending = false; // nauja versija aktyvi, bet persikrauti dar nebuvo galima (vaikas žaidžia)
let canReloadNow = () => true;

/** Iškviečiama keičiant ekraną: jei laukia atnaujinimas – persikraunam dabar (true). */
export function applyPendingUpdate() {
  if (!pending) return false;
  pending = false;
  window.location.reload();
  return true;
}

export function setupPwa({ canReload } = {}) {
  if (!('serviceWorker' in navigator)) return;
  if (canReload) canReloadNow = canReload;
  const updateSW = registerSW({
    immediate: true,
    // Nauja versija aktyvuota: jei dabar žaidžiama – palaukiam, kol vaikas išeis iš žaidimo.
    onNeedReload() {
      if (canReloadNow()) window.location.reload();
      else pending = true;
    },
    // Jei nauja versija vis tiek laukia – aktyvuojam ją ir persikraunam.
    onNeedRefresh() {
      updateSW(true);
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (document.hidden || !navigator.onLine) return;
        reg.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', check);
      setInterval(check, EVERY);
    },
  });
}
