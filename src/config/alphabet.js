// Lietuvių abėcėlė: raidė, garso failo vardas (audio/letters/) ir raidės PAVADINIMAS.
// Įrašuose ir balso sintezėje tariamas pavadinimas, ne garsas („bė“, ne „b“).
// Panašioms raidėms – pilni pavadinimai, kad vaikas girdėtų skirtumą.
export const ALPHABET = [
  { ch: 'A', file: 'a', name: 'a' },
  { ch: 'Ą', file: 'a_nosine', name: 'a nosinė' },
  { ch: 'B', file: 'b', name: 'bė' },
  { ch: 'C', file: 'c', name: 'cė' },
  { ch: 'Č', file: 'c_varnele', name: 'čė' },
  { ch: 'D', file: 'd', name: 'dė' },
  { ch: 'E', file: 'e', name: 'e' },
  { ch: 'Ę', file: 'e_nosine', name: 'e nosinė' },
  { ch: 'Ė', file: 'e_taskas', name: 'ė' },
  { ch: 'F', file: 'f', name: 'ef' },
  { ch: 'G', file: 'g', name: 'gė' },
  { ch: 'H', file: 'h', name: 'ha' },
  { ch: 'I', file: 'i_trumpoji', name: 'i trumpoji' },
  { ch: 'Į', file: 'i_nosine', name: 'i nosinė' },
  { ch: 'Y', file: 'y', name: 'y ilgoji' },
  { ch: 'J', file: 'j', name: 'jot' },
  { ch: 'K', file: 'k', name: 'ka' },
  { ch: 'L', file: 'l', name: 'el' },
  { ch: 'M', file: 'm', name: 'em' },
  { ch: 'N', file: 'n', name: 'en' },
  { ch: 'O', file: 'o', name: 'o' },
  { ch: 'P', file: 'p', name: 'pė' },
  { ch: 'R', file: 'r', name: 'er' },
  { ch: 'S', file: 's', name: 'es' },
  { ch: 'Š', file: 's_varnele', name: 'eš' },
  { ch: 'T', file: 't', name: 'tė' },
  { ch: 'U', file: 'u_trumpoji', name: 'u trumpoji' },
  { ch: 'Ų', file: 'u_nosine', name: 'u nosinė' },
  { ch: 'Ū', file: 'u_ilgoji', name: 'u ilgoji' },
  { ch: 'V', file: 'v', name: 'vė' },
  { ch: 'Z', file: 'z', name: 'zė' },
  { ch: 'Ž', file: 'z_varnele', name: 'žė' },
];

// Lengvesniam lygiui – tik paprastos raidės: be nosinių, varnelių, taškų ir be Y (painiojama su I).
export const EASY_ALPHABET = ALPHABET.filter((l) => /^[A-Z]$/.test(l.ch) && l.ch !== 'Y');

// Vizualiai / garsiškai panašios raidės. 1 lygyje jos neturi būti kartu,
// 2 lygyje sąmoningai maišomos.
export const SIMILAR_GROUPS = [
  ['A', 'Ą'],
  ['E', 'Ę', 'Ė'],
  ['I', 'Į', 'Y'],
  ['U', 'Ų', 'Ū'],
  ['C', 'Č'],
  ['S', 'Š'],
  ['Z', 'Ž'],
];

export function groupOf(ch) {
  return SIMILAR_GROUPS.find((g) => g.includes(ch)) || [ch];
}

export function letterByChar(ch) {
  return ALPHABET.find((l) => l.ch === ch);
}
