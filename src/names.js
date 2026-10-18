// Lietuviški vardai: lytis pagal galūnę ir šauksmininkas (kreipinys).
//
// Berniukai: -as, -is, -ys, -us (Jonas, Kęstutis, Kazys, Kajus).
// Mergaitės: -a, -ė (Ona, Eglė, Austėja, Gabija).
// Kitos galūnės (pvz. trumpiniai, užsienio vardai) – lytis nežinoma, ją pasirenka tėvai.

// Retos išimtys: vyriški vardai su -a.
const MALE_A = new Set(['jogaila', 'mykola', 'kosta', 'saba']);

/** Grąžina 'm', 'f' arba null (nežinoma). */
export function guessGender(raw) {
  const name = firstWord(raw).toLowerCase();
  if (name.length < 2) return null;
  if (MALE_A.has(name)) return 'm';
  if (/(as|is|ys|us)$/.test(name)) return 'm';
  if (/(a|ė)$/.test(name)) return 'f';
  return null;
}

/** Šauksmininkas: Jonas → Jonai, Kajus → Kajau, Paulius → Pauliau, Kęstutis → Kęstuti, Eglė → Egle. */
export function vocative(raw, gender) {
  const name = firstWord(raw);
  if (!name) return '';
  const low = name.toLowerCase();
  const cut = (n, add) => name.slice(0, name.length - n) + add;
  if (gender === 'f') {
    if (low.endsWith('ė')) return cut(1, 'e');
    if (low.endsWith('is')) return cut(2, 'ie'); // Smiltis → Smiltie
    return name;
  }
  if (low.endsWith('ius')) return cut(2, 'au'); // Paulius → Pauliau
  if (low.endsWith('us')) return cut(2, 'au'); // Kajus → Kajau
  if (low.endsWith('as')) return cut(2, 'ai'); // Jonas → Jonai
  if (low.endsWith('ys')) return cut(2, 'y'); // Kazys → Kazy
  if (low.endsWith('is')) return cut(2, 'i'); // Kęstutis → Kęstuti
  return name;
}

/** Pirmoji raidė didžioji, kitos kaip įvestos. */
export function tidyName(raw) {
  const n = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  return n ? n[0].toLocaleUpperCase('lt') + n.slice(1) : '';
}

function firstWord(raw) {
  return String(raw || '').trim().split(/\s+/)[0] || '';
}
