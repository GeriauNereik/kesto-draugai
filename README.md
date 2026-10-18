# Miškiniai

Lietuviškas mokomasis žaidimas vaikams (3–8 m.). PWA: atsidaroma iPhone Safari,
pridedama į pradžios ekraną ir veikia be interneto.

Vedlė – **pelėda Ona** (kalba tuo pačiu moterišku balsu kaip visi įrašai).
Žaidimai: **Raidės** (Ežys Domas), **Skaičiai** (Bebras Kęstas), **Poros** (Voverė Vėja),
po kas antro žaidimo – judesio pertraukėlė su Stirniuku Tadu.

## Įdiegimas ir paleidimas

Reikia [Node.js](https://nodejs.org) 20+.

```bash
npm install
npm run dev -- --host     # dev serveris; adresą "Network: http://192.168.x.x:5173" atsidaryk iPhone tame pačiame Wi-Fi
npm run build             # gamybinė versija į dist/
npm run preview -- --host # peržiūrėti dist/ versiją
```

Per `http://` (dev) service worker iPhone neveikia, todėl offline režimo ten nebus –
bet žaidimą išbandyti galima. Offline veikia tik per HTTPS (žr. „Publikavimas“).

## Garso įrašai

Įrašus dėk į `public/assets/audio/` (`letters/`, `numbers/`, `phrases/`).
Visas failų sąrašas: [public/assets/audio/README.md](public/assets/audio/README.md).

Visi įrašai sugeneruoti lietuvišku balsu **krapas-Regina** (LIEPA projekto įrašai, Vilniaus universitetas;
modelis CC BY-NC 4.0 – tik nekomerciniam naudojimui) skriptu `scripts/regina/make_audio_regina.py`.
Savo įrašą įdėk tuo pačiu failo vardu ir paleisk `npm run build`. Plačiau: [public/assets/audio/README.md](public/assets/audio/README.md).

## Kur ką keisti

| Ką | Kur |
|---|---|
| Veikėjų vardai, paveikslėliai | `src/config/characters.js`, `public/assets/characters/` |
| Frazių tekstai | `src/config/phrases.js` |
| Abėcėlė, panašių raidžių grupės | `src/config/alphabet.js` |
| Raundo ilgis, žvaigždučių taisyklės | `src/config/games.js` |
| Spalvos, dydžiai | `src/style.css` (`:root`) |
| Ikonos | `npm run icons` (generuoja iš `peleda_happy.webp`) |
| Sąsajos animacijos | `src/ui/motion.js` (GSAP) |
| Piešimo užduotys (650 „Nupiešk …!“) | `src/config/draw-items.js` (žodžiai galininku); įrašai `public/assets/audio/draw/` – `python scripts/regina/make_audio_regina.py` sugeneruoja trūkstamus |
| Portretai (avatarai, porų kortelės) | `npm run portraits` – sugeneruoja iš rig dalių į `public/assets/characters/portraits/` |
| Gyvi veikėjai | `src/character/character.js` (Web Animations API), dalys – `public/assets/rigs/{veikejas}/`, sukimosi taškai – `src/rigs/{veikejas}.json` |

Progresas (žvaigždutės) saugomas tik įrenginyje (`localStorage`). Jokios analitikos,
jokių išorinių užklausų.

## Gyvi veikėjai (animacija iš dalių)

Kiekvienas veikėjas gali būti suskaidytas į dalis (kūnas, galva, akys, burna, rankos…) – tada jis kvėpuoja,
mirksi, pašoka, linkteli ir „kalba“, kol skamba jo frazė. Kol dalių nėra, veikėjas animuojamas visu paveikslėliu.

1. Įkelkite dalis į `public/assets/rigs/{veikejas}/` (failų sąrašas: [public/assets/rigs/README.md](public/assets/rigs/README.md)).
2. `npm run dev` ir atsidarykite **http://localhost:5173/rig-editor.html** – pasirinkite veikėją, kiekvienam sluoksniui
   spustelėkite sukimosi tašką (petys, kaklas, pėdos), patikrinkite būsenas ir paspauskite „Išsaugoti į projektą“.
3. `npm run build`.

## Publikavimas nemokamai (HTTPS)

### Netlify Drop (paprasčiausia)

1. `npm run build`
2. Atsidaryk <https://app.netlify.com/drop> ir nutempk `dist` aplanką.
3. Gausi `https://...netlify.app` adresą.

### GitHub Pages (automatiškai)

Kiekvienas `git push` į `main` šaką paleidžia `.github/workflows/deploy.yml`: sukompiliuoja ir įkelia į
`https://<vartotojas>.github.io/<saugykla>/`. Vienkartinis nustatymas: saugyklos **Settings → Pages →
Source: GitHub Actions**. Eiga matosi skirtuke **Actions** (~1–2 min.).

Įdiegta programėlė naują versiją pasitikrina kaskart ją atidarius (ir kas 30 min.) ir persikrauna pati
(`src/pwa.js`). Kuri versija veikia – matosi tėvų skiltyje „Apie → Versija“ (data · commit).

### iPhone

1. Safari atsidaryk HTTPS adresą, palauk kol užsikraus.
2. Bendrinti → **Pridėti prie pradžios ekrano**.
3. Paleisk iš pradžios ekrano vieną kartą su internetu – viskas išsaugoma.
4. Toliau veikia ir lėktuvo režimu.

Atnaujinus versiją, programėlė atsinaujina pati ją atidarius (su internetu).

## Admin panelė

Atskira nuo žaidimo, veikia kompiuteryje:

```bash
npm run admin
```

Atsidaro <http://localhost:5180>. Prisijungiama Firebase admin paskyra (`ADMIN_EMAIL` faile
`src/sync/config.js` ir `firestore.rules` turi sutapti). Matosi kiekvienas įrenginys ir jo žaidėjai:
kiek laiko žaista per 7 dienas, kas žaista ir nupiešta. Galima uždėti užraktą su kodu ir žinute
(vienam žaidėjui arba visiems) – telefone žaisti bus galima tik suvedus kodą.

Firebase projektas: `miskiniai-616db`. Pakeitus taisykles: `npx firebase-tools deploy --only firestore:rules`.
