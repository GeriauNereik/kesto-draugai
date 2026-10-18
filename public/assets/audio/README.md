# Garso įrašai

Visi failai sugeneruoti lietuvišku balsu **krapas-Regina** – OmniVoice modeliu, apmokytu su
Reginos Jokubauskaitės įrašais iš LIEPA projekto (Vilniaus universitetas). Generuojama lokaliai šiame
kompiuteryje, tekstai prieš tai sukirčiuojami modeliu `banano-kirtis-v2`. Programa įrašus groja be interneto.

**Licencija:** modelio svoriai CC BY-NC 4.0 – tik nekomerciniam naudojimui; LIEPA įrašai CC BY 4.0
(būtina nurodyti LIEPA / Vilniaus universitetą – nurodyta tėvų skilties „Apie“ kortelėje).
Jei programėlė kada nors taptų komercine, šiuos įrašus reikės pakeisti.

Savo įrašą įdėkite tuo pačiu vardu ir paleiskite `npm run build`. Generatorius kuria tik trūkstamus failus:

```bash
uv venv --python 3.12 .venv-regina && source .venv-regina/bin/activate
uv pip install omnivoice soundfile lameenc
python scripts/regina/make_audio_regina.py               # tik trūkstami
python scripts/regina/make_audio_regina.py letters/y     # perdaryti konkretų (kiekvienas bandymas šiek tiek skiriasi)
python scripts/regina/make_audio_regina.py --force       # perdaryti viską (perrašo ir savus įrašus!)
```

Pirmą kartą atsisiunčiami modeliai (~5 GB). Apple M1 – apie 4 s vienam failui.
**Kirčiavimas** – modelio autoriaus konvejeris (`scripts/regina/krapas_text/`): pirmiausia korpuso žodynas
(130 tūkst. formų), tada Vikižodynas (139 tūkst.), modelis `banano-kirtis-v2` – tik nežinomiems žodžiams;
nepatikimi spėjimai paliekami be kirčio. Sukirčiuoti tekstai – `scripts/regina/sukirciuota.json`.
Blogai sukirčiuotą žodį įrašykite į `scripts/regina/kirciai.json` (pvz. `"rask": "ràsk"`) ir perdarykite failą.

**Tempas – natūralus.** Nelėtinkite (`SPEED`): lietuvių kirtis girdimas iš skiemens ilgumo, o ištempus
visus balsius kirčiuoti ir nekirčiuoti skiemenys susilieja. Garsumas – `PEAK`.

Atsarginis variantas be didelių modelių – Microsoft Edge balsas Ona: `pip install edge-tts && python3 scripts/make_audio.py`.

Tekstai imami iš `src/config/alphabet.js` (raidžių pavadinimai) ir `src/config/phrases.js`.

**Formatas:** MP3, mono. Tyla pradžioje ir pabaigoje programoje nukerpama automatiškai.
Failų varduose jokių lietuviškų raidžių, tik mažosios lotyniškos ir `_`.

## `letters/` – raidės (32)

Tariamas raidės **pavadinimas**, ne garsas („bė“, ne „b“). Panašioms raidėms – pilni pavadinimai,
kad vaikas girdėtų skirtumą.

| Failas | Raidė | Tariama | | Failas | Raidė | Tariama |
|---|---|---|---|---|---|---|
| `a.mp3` | A | a | | `k.mp3` | K | ka |
| `a_nosine.mp3` | Ą | a nosinė | | `l.mp3` | L | el |
| `b.mp3` | B | bė | | `m.mp3` | M | em |
| `c.mp3` | C | cė | | `n.mp3` | N | en |
| `c_varnele.mp3` | Č | čė | | `o.mp3` | O | o |
| `d.mp3` | D | dė | | `p.mp3` | P | pė |
| `e.mp3` | E | e | | `r.mp3` | R | er |
| `e_nosine.mp3` | Ę | e nosinė | | `s.mp3` | S | es |
| `e_taskas.mp3` | Ė | ė | | `s_varnele.mp3` | Š | eš |
| `f.mp3` | F | ef | | `t.mp3` | T | tė |
| `g.mp3` | G | gė | | `u_trumpoji.mp3` | U | u trumpoji |
| `h.mp3` | H | ha | | `u_nosine.mp3` | Ų | u nosinė |
| `i_trumpoji.mp3` | I | i trumpoji | | `u_ilgoji.mp3` | Ū | u ilgoji |
| `i_nosine.mp3` | Į | i nosinė | | `v.mp3` | V | vė |
| `y.mp3` | Y | y ilgoji | | `z.mp3` | Z | zė |
| `j.mp3` | J | jot | | `z_varnele.mp3` | Ž | žė |

## `numbers/` – skaičiai (10)

`1.mp3` „vienas“, `2.mp3` „du“, `3.mp3` „trys“, `4.mp3` „keturi“, `5.mp3` „penki“,
`6.mp3` „šeši“, `7.mp3` „septyni“, `8.mp3` „aštuoni“, `9.mp3` „devyni“, `10.mp3` „dešimt“.

## `phrases/` – frazės (31)

Tekstai taip pat yra `src/config/phrases.js`.

Frazės su **[vardas]** ekrane rodomos su vaiko vardu („Labas, Jonai!“). Įrašą darykite **be vardo**
(„Labas! Aš Ona…“) – vardo įrašyti neįmanoma, o be įrašo iPhone balsas jį ištars pats.

| Failas | Tekstas |
|---|---|
| `susipazinkime.mp3` | Labas! Aš pelėda Ona. Kuo tu vardu? |
| `draugas.mp3` | Pasirink savo miško draugą! |
| `malonu.mp3` | Malonu susipažinti[, vardas]! |
| `kas_zais.mp3` | Kas šiandien žais? |
| `labas.mp3` | Labas[, vardas]! Aš Ona. Ką žaisime šiandien? |
| `ka_zaisime.mp3` | Ką žaisime šiandien? (meniu iškart po susipažinimo) |
| `domas_intro.mp3` | Klausyk garso ir paspausk teisingą raidę! |
| `kestas_intro.mp3` | Suskaičiuok rąstelius ir paspausk skaičių! |
| `veja_intro.mp3` | Rask poras! Atsimink, kur kas slepiasi. (sako voverė Vėja) |
| `kestas_math_intro.mp3` | Sudėk arba atimk rąstelius ir paspausk atsakymą! |
| `kestas_hub.mp3` | Ką skaičiuosime? |
| `debesys_intro.mp3` | Išspręsk, kol debesėlis nepakilo į viršų! |
| `laikrodis_intro.mp3` | Kiek valandų rodo laikrodis? |
| `gedas_intro.mp3` | Pagalvok ir pasirink atsakymą! Jei sunku, paspausk lemputę. |
| `nepavyko.mp3` | Šįkart nepavyko. Pabandyk dar kartą! |
| `laikas_baigesi.mp3` | Laikas baigėsi! |
| `kryziukai_intro.mp3` | Sudėk tris kryžiukus į vieną eilę! Aš dėsiu nuliukus. |
| `lygiosios.mp3` | Lygiosios! |
| `veja_laimejo.mp3` | Šįkart laimėjau aš! |
| `pasiruoses.mp3` | Ar esi pasiruošęs? (berniukui) |
| `pasiruosusi.mp3` | Ar esi pasiruošusi? (mergaitei) |
| `puiku.mp3` | Puiku! |
| `saunuolis.mp3` | Šaunuolis! (berniukui) |
| `saunuole.mp3` | Šaunuolė! (mergaitei) |
| `teisingai.mp3` | Teisingai! |
| `bandyk_dar.mp3` | Beveik! Pabandyk dar kartą. |
| `kur_raide.mp3` | Kur raidė…? (be pačios raidės – ji skamba atskiru failu iškart po šios frazės) |
| `baigta_1.mp3` | Gerai padirbėjai[, vardas]! Tu surinkai vieną žvaigždutę! |
| `baigta_2.mp3` | Šaunu[, vardas]! Tu surinkai dvi žvaigždutes! |
| `baigta_3.mp3` | Puiku[, vardas]! Tu surinkai tris žvaigždutes! |
| `tadas_pertrauka.mp3` | Laikas pajudėti[, vardas]! Pašokinėk kartu su manimi penkis kartus! |

Iš viso: 63 failai (32 raidės + 10 skaičių + 21 frazė). Garso efektai (paspaudimai, skambesiai) sintezuojami programoje ir failų nereikia.

## `draw/` – piešimo užduotys (650)

„Nupiešk katę!“ ir pan. Sąrašas – `src/config/draw-items.js`, failo vardas – `drawId(žodis)` (š → sh, ž → zh, č → ch).
Trūkstamus sugeneruoja `scripts/regina/make_audio_regina.py`.
