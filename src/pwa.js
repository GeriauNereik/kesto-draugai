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

/**
 * Rankinis atnaujinimas (tėvų skiltis): palygina veikiančią versiją su serverio version.json.
 * Jei serveryje naujesnė – ištrina išsaugotą seną versiją (service worker'į ir jo talpyklas) ir persikrauna:
 * puslapis parsisiunčia iš naujo, o service worker'is įsidiegia iš naujo. Žvaigždutės ir profiliai (localStorage) lieka.
 * onStatus(tekstas) – pranešimai vartotojui. Grąžina 'latest' | 'updating' | 'offline'.
 */
export async function forceUpdate(onStatus = () => {}) {
  onStatus('Tikrinama…');
  let latest = null;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) latest = (await res.json()).version;
  } catch {
    /* be ryšio */
  }
  if (!latest) {
    onStatus(navigator.onLine ? 'Nepavyko patikrinti – pabandykite vėliau.' : 'Nėra interneto ryšio – pabandykite vėliau.');
    return 'offline';
  }
  if (latest && latest === __APP_VERSION__) {
    onStatus('Jūs turite naujausią versiją.');
    return 'latest';
  }
  onStatus(`Atsisiunčiama nauja versija (${latest})…`);
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
    if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {
    /* net jei nepavyko išvalyti – persikraunam */
  }
  setTimeout(() => window.location.reload(), 300);
  return 'updating';
}
