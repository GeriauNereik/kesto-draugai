// Atnaujinimai telefone: įdiegta programėlė (pridėta prie pradžios ekrano) nauja versija pasitikrina
// kiekvieną kartą ją atidarius ar grįžus iš fono, ir dar kas 30 min. Radus naują – persikrauna pati.
import { registerSW } from 'virtual:pwa-register';

const EVERY = 30 * 60 * 1000;

export function setupPwa() {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
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
