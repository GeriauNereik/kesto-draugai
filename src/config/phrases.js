// Frazių raktai (= failų vardai audio/phrases/) ir jų tekstai.
// {vardas} pakeičiamas vaiko vardu šauksmininku (Jonai, Egle). Jei vardo nėra, ", {vardas}" praleidžiamas.
export const PHRASES = {
  susipazinkime: 'Labas! Aš pelėda Ona. Kuo tu vardu?',
  draugas: 'Pasirink savo miško draugą!',
  malonu: 'Malonu susipažinti, {vardas}!',
  kas_zais: 'Kas šiandien žais?',
  labas: 'Labas, {vardas}! Aš Ona. Ką žaisime šiandien?',
  ka_zaisime: 'Ką žaisime šiandien?',
  domas_intro: 'Klausyk garso ir paspausk teisingą raidę!',
  kestas_intro: 'Suskaičiuok rąstelius ir paspausk skaičių!',
  veja_intro: 'Rask poras! Atsimink, kur kas slepiasi.',
  kestas_math_intro: 'Sudėk arba atimk rąstelius ir paspausk atsakymą!',
  kestas_hub: 'Ką skaičiuosime?',
  debesys_intro: 'Išspręsk, kol debesėlis nepakilo į viršų!',
  laikrodis_intro: 'Kiek valandų rodo laikrodis?',
  gedas_intro: 'Pagalvok ir pasirink atsakymą! Jei sunku, paspausk lemputę.',
  nepavyko: 'Šįkart nepavyko. Pabandyk dar kartą!',
  laikas_baigesi: 'Laikas baigėsi!',
  kryziukai_intro: 'Sudėk tris kryžiukus į vieną eilę! Aš dėsiu nuliukus.',
  lygiosios: 'Lygiosios!',
  veja_laimejo: 'Šįkart laimėjau aš!',
  pasiruoses: 'Ar esi pasiruošęs?',
  pasiruosusi: 'Ar esi pasiruošusi?',
  puiku: 'Puiku!',
  saunuolis: 'Šaunuolis!',
  saunuole: 'Šaunuolė!',
  teisingai: 'Teisingai!',
  bandyk_dar: 'Beveik! Pabandyk dar kartą.',
  kur_raide: 'Kur raidė…?',
  // Rezultatas: pagal surinktų žvaigždučių skaičių
  baigta_1: 'Gerai padirbėjai, {vardas}! Tu surinkai vieną žvaigždutę!',
  baigta_2: 'Šaunu, {vardas}! Tu surinkai dvi žvaigždutes!',
  baigta_3: 'Puiku, {vardas}! Tu surinkai tris žvaigždutes!',
  tadas_pertrauka: 'Laikas pajudėti, {vardas}! Pašokinėk kartu su manimi penkis kartus!',
};

// Vyriška forma → moteriška forma (abi turi savo įrašą).
export const GENDERED = {
  saunuolis: 'saunuole',
  pasiruoses: 'pasiruosusi',
};

export const PRAISE_KEYS = ['puiku', 'saunuolis', 'teisingai'];

export function randomPraise() {
  return PRAISE_KEYS[Math.floor(Math.random() * PRAISE_KEYS.length)];
}
