# Miškiniai – MVP užduotis Claude Code

Sukurk veikiantį MVP: lietuvišką mokomąjį žaidimą vaikams nuo 3 iki 8 metų. Tai PWA (web programėlė), kurią šeimos nariai atsidarys iPhone Safari naršyklėje, pridės į pradžios ekraną („Add to Home Screen“) ir žais be interneto.

Prieš rašydamas kodą, trumpai pateik planą (failų struktūrą ir eiliškumą), tada įgyvendink žingsnis po žingsnio. Po kiekvieno didesnio žingsnio paleisk `npm run build` ir ištaisyk klaidas.

---

## 1. Technologijos

- **Vite + vanilla JavaScript** (ES modules), be React ir be žaidimų variklių. Žaidimai paprasti: paspaudimai, kortelės, animacijos per CSS.
- **vite-plugin-pwa**: manifest, service worker, visų resursų (paveikslėlių, šrifto, garsų) precache, kad viskas veiktų offline.
- Šriftas: **Nunito** per `@fontsource/nunito`, įtrauktas lokaliai (ne iš Google Fonts CDN). Jis palaiko lietuviškas raides ą č ę ė į š ų ū ž.
- Jokių analitikos įrankių, jokių išorinių užklausų, jokių asmens duomenų. Progresas saugomas tik `localStorage` (su try/catch).

## 2. Resursai

Projekto šaknyje yra `miskiniai_emocijos.zip`. Išarchyvuok jį į `public/assets/characters/`. Viduje 18 failų (6 veikėjai × 3 emocijos), formatas WebP su permatomu fonu:

| Failo prefiksas | Veikėjas | Vaidmuo |
|---|---|---|
| `gandras_` | Gandras Gedas | vedlys, pagrindinio meniu šeimininkas |
| `domas_` | Ežys Domas | raidžių žaidimas |
| `kestas_` | Bebras Kęstas | skaičiavimo žaidimas |
| `peleda_` | Pelėda Ona | atminties (porų) žaidimas |
| `elnias_` | Stirniukas Tadas | judesio pertraukėlė |
| `vovere_` | Voverė Vėja | MVP nenaudojama, palik konfigūracijoje ateičiai |

Emocijos: `_think` (laukia atsakymo, naudoti ir kaip neutralią), `_happy` (teisingas atsakymas), `_encourage` (padrąsinimas po klaidos).

Veikėjų vardus ir failų kelius laikyk viename konfigūracijos faile `src/config/characters.js`, kad vėliau būtų lengva pakeisti.

## 3. Garsas (svarbiausia dalis)

Sukurk modulį `src/audio.js` su funkcija `say(key)`, kuri veikia tokia tvarka:

1. Bando paleisti įrašytą failą `public/assets/audio/{key}.mp3`.
2. Jei failo nėra, bando `speechSynthesis` su `lt-LT` balsu.
3. Jei lietuviško balso nėra, garsas tyliai praleidžiamas, o tekstas visada rodomas ekrane veikėjo kalbos burbule.

Šiuo metu įrašų dar nėra, jie bus įrašyti vėliau. Sukurk `public/assets/audio/README.md` su visų reikalingų failų sąrašu.

**Raidžių failų pavadinimai** (be lietuviškų simbolių failų varduose):
a, a_nosine (Ą), b, c, c_varnele (Č), d, e, e_nosine (Ę), e_taskas (Ė), f, g, h, i, i_nosine (Į), y, j, k, l, m, n, o, p, r, s, s_varnele (Š), t, u, u_nosine (Ų), u_ilgoji (Ū), v, z, z_varnele (Ž). Failai dedami į `audio/letters/`.

**Skaičiai:** `audio/numbers/1.mp3` … `audio/numbers/10.mp3`.

**Frazės** (`audio/phrases/`), su tekstu konfigūracijoje:
- `labas`: „Labas! Aš Gedas. Ką žaisime šiandien?“
- `domas_intro`: „Klausyk garso ir paspausk teisingą raidę!“
- `kestas_intro`: „Suskaičiuok rąstelius ir paspausk skaičių!“
- `ona_intro`: „Rask poras! Atsimink, kur kas slepiasi.“
- `puiku`, `saunuolis`, `teisingai`: pagyrimai, parenkami atsitiktinai.
- `bandyk_dar`: „Beveik! Pabandyk dar kartą.“
- `kur_raide`: „Kur raidė…?“
- `baigta`: „Šaunu! Tu surinkai žvaigždutes!“
- `tadas_pertrauka`: „Laikas pajudėti! Pašokinėk kartu su manimi penkis kartus!“

**iOS ypatumai:** garsas Safari veikia tik po vartotojo paspaudimo. Pirmas ekranas turi būti didelis mygtukas „Pradėti“, kuris „atrakina“ garsą (sukuria ir paleidžia tylų AudioContext / tuščią garsą). Iš anksto užkrauk (preload) dažniausiai naudojamus failus.

## 4. Ekranai ir srautas

1. **Pradžios ekranas.** Gedas (`gandras_happy`), pavadinimas „Miškiniai“, didelis mygtukas „Pradėti“.
2. **Pagrindinis meniu.** Gedas su kalbos burbulu (`labas`). Trys didelės kortelės su veikėjų paveikslėliais: Domas („Raidės“), Kęstas („Skaičiai“), Ona („Poros“). Ant kiekvienos kortelės rodomos surinktos žvaigždutės.
3. **Lygio pasirinkimas.** Prieš žaidimą du dideli mygtukai: „Lengviau“ (1 lygis) ir „Sunkiau“ (2 lygis).
4. **Žaidimas** (žr. 5 skyrių). Viršuje: mygtukas „Atgal“ (namelio ikona), progreso juosta (pvz., 3/10), mygtukas „Pakartoti garsą“ (garsiakalbio ikona).
5. **Rezultato ekranas.** Veikėjas `_happy`, 1–3 žvaigždutės, mygtukai „Žaisti dar“ ir „Į meniu“.
6. **Judesio pertraukėlė.** Po kas antro baigto žaidimo rodomas Tadas (`elnias_happy`) su `tadas_pertrauka` ir mygtukais „Padariau!“ bei „Praleisti“.

Navigacija be URL maršrutų, paprastas ekranų jungiklis (state machine) viename `main.js`. Kiekvienas žaidimas atskirame modulyje `src/games/`.

## 5. Žaidimai

Bendros taisyklės visiems:
- Vienas raundas = 10 užduočių (porų žaidime – visos poros).
- **Pralaimėti negalima.** Po klaidos neteisingas pasirinkimas švelniai sudreba ir pašviesėja (tampa neaktyvus), veikėjas parodo `_encourage`, skamba `bandyk_dar`, o vaikas bando toliau.
- Po teisingo atsakymo veikėjas parodo `_happy`, skamba atsitiktinis pagyrimas, po 1,2 s pereinama prie kitos užduoties.
- Laukiant atsakymo rodomas `_think`.
- Žvaigždutės: 3 už ≤2 klaidas, 2 už ≤5 klaidas, 1 už daugiau. Išsaugomas geriausias rezultatas.
- Neleisti dvigubų paspaudimų, kol vyksta perėjimo animacija.

### 5.1 Domas: „Išgirsk ir paspausk“
- Abėcėlė (32 raidės): A Ą B C Č D E Ę Ė F G H I Į Y J K L M N O P R S Š T U Ų Ū V Z Ž.
- Užduotis: skamba raidės garsas (`kur_raide`, tada raidė), ekrane didelės raidžių kortelės.
- **1 lygis:** 3 pasirinkimai, raidės vizualiai skirtingos (pvz., nemaišyti A ir Ą).
- **2 lygis:** 4 pasirinkimai, sąmoningai įtraukiamos panašios grupės: A/Ą, E/Ę/Ė, I/Į/Y, U/Ų/Ū, C/Č, S/Š, Z/Ž.
- Raidės didelės (≥ 72px), rodomos didžiosiomis.
- Raundo metu raidės nesikartoja.

### 5.2 Kęstas: „Suskaičiuok rąstelius“
- Ekrane rodomi rąsteliai. Rąstelį nupiešk kaip paprastą inline SVG (šiltai rudas cilindras su metinėmis rievėmis, švelnūs kontūrai, atitinka pastelinį stilių).
- Paspaudus rąstelį, jis pažymimas ir ištariamas eilės skaičius (1, 2, 3…). Tai padeda vaikui skaičiuoti, bet nėra privaloma.
- Apačioje 3 skaičių mygtukai, iš kurių vienas teisingas.
- **1 lygis:** 1–5 rąsteliai. **2 lygis:** 1–10 rąstelių.
- Rąsteliai išdėstomi tvarkingai (eilutėmis po 5), ne chaotiškai.

### 5.3 Ona: „Rask porą“
- Atminties kortelės. Kortelių priekyje vaizduojami patys veikėjai (`_happy` versijos), nugarėlėje paprastas lapelio ar medžio raštas.
- **1 lygis:** 3 poros (6 kortelės). **2 lygis:** 6 poros (12 kortelių).
- Atverčiamos dvi kortelės. Jei sutampa, lieka atverstos, o Ona džiaugiasi. Jei ne, po 1 s užsiverčia.
- Šiame žaidime klaida neskaičiuojama kaip „klaida“: žvaigždutės skiriamos pagal bandymų skaičių.

## 6. Dizainas

Stilius ramus, minimalistinis, skandinaviškas, be ryškių mirksinčių animacijų. Spalvos turi derėti prie pastelinių veikėjų iliustracijų:

```
--bg:        #FBF6EE  (kreminis fonas)
--surface:   #FFFFFF
--sage:      #A8BFA3  (pagrindinis akcentas, mygtukai)
--ochre:     #E3B873  (žvaigždutės, pabrėžimai)
--dusty-blue:#9FB7C9
--brown:     #6B4A3A  (tekstas, kontūrai)
--soft-red:  #E8A39A  (švelnus klaidos atspalvis, ne raudonas)
```

- Visi lietimo taikiniai ≥ 64×64px, tarpai tarp mygtukų pakankami mažiems pirštams.
- Apvalūs kampai (16–24px), minkšti šešėliai.
- Animacijos trumpos ir švelnios (200–400 ms): lengvas „pašokimas“ atsakius teisingai, švelnus drebėjimas po klaidos. Gerbk `prefers-reduced-motion`.
- Veikėjas kiekviename žaidime rodomas kampe arba šone su kalbos burbulu.
- Tekstų mažai, dideli, nes vaikai dar neskaito: viską turi išsakyti garsas, o tekstas skirtas tėvams.
- Šviesi tema visada (vaikų programėlei tamsios temos nereikia), bet nustatyk `color-scheme: light`.

## 7. iPhone / PWA reikalavimai

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon` (180×180, sugeneruok iš `gandras_happy` su kreminiu fonu).
- Manifest: `display: standalone`, `name: "Miškiniai"`, `lang: "lt"`, `background_color` ir `theme_color` iš paletės, ikonos 192 ir 512 px.
- Saugios zonos: `env(safe-area-inset-*)` padding, kad niekas nepatektų po „notch“ ar apatine juosta.
- `touch-action: manipulation`, išjungti teksto žymėjimą ir ilgo paspaudimo meniu ant žaidimo elementų (`user-select: none`, `-webkit-touch-callout: none`).
- Veikti ir vertikaliai, ir horizontaliai. Horizontaliai veikėjas šone, užduotis centre.
- Testuoti maketą pločiuose 375px, 390px, 430px ir horizontalioje padėtyje.

## 8. Struktūra (orientacinė)

```
/public
  /assets/characters/   (18 WebP)
  /assets/audio/        (README.md, vėliau mp3)
  /icons/
/src
  main.js               (ekranų jungiklis, garso atrakinimas)
  audio.js
  storage.js            (žvaigždutės, žaidimų skaitiklis pertraukėlei)
  /config/characters.js
  /config/phrases.js    (frazių raktai ir tekstai)
  /config/alphabet.js   (raidės, failų pavadinimai, panašių raidžių grupės)
  /screens/             (start, menu, level, result, break)
  /games/               (letters.js, counting.js, memory.js)
  /ui/                  (speech-bubble, button, progress, stars)
  style.css
index.html
vite.config.js
```

## 9. Paleidimas ir testavimas

- `npm run dev -- --host`: kad būtų galima atsidaryti iPhone tame pačiame Wi-Fi tinkle (service worker per http neveiks, bet žaidimą išbandyti galima).
- `npm run build` ir `npm run preview`.
- Pridėk trumpą `README.md`: kaip įdiegti, paleisti, kur dėti garso įrašus ir kaip publikuoti nemokamai su HTTPS (Netlify Drop arba GitHub Pages), kad PWA veiktų offline iPhone telefone.

## 10. Priėmimo kriterijai

- [ ] Programėlė atsidaro iPhone Safari, pridedama į pradžios ekraną ir paleidžiama be naršyklės juostos.
- [ ] Po pirmo atidarymo veikia be interneto (lėktuvo režimu).
- [ ] Visi trys žaidimai praeinami nuo pradžios iki rezultato ekrano abiejuose lygiuose.
- [ ] Klaida niekada nebaigia žaidimo, vaikas visada gali bandyti dar.
- [ ] Žvaigždutės išsaugomos ir matomos meniu po programėlės perkrovimo.
- [ ] Garsas veikia po „Pradėti“ paspaudimo. Nesant mp3 failų, naudojamas TTS arba tik tekstas, ir niekas nelūžta.
- [ ] Lietuviškos raidės (ą č ę ė į š ų ū ž) visur rodomos teisingai.
- [ ] Nėra jokių išorinių tinklo užklausų (patikrink DevTools Network skirtuke).
- [ ] Judesio pertraukėlė pasirodo po kas antro baigto žaidimo ir ją galima praleisti.
