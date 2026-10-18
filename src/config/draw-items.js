// Piešimo užduotys: „Nupiešk …!“ – visi žodžiai jau galininku (ką? – katę, šunį, autobusą).
// Garso failai: public/assets/audio/draw/{drawId(tekstas)}.mp3 (scripts/regina/make_audio_regina.py).

const ANIMALS = `
katę, kačiuką, šunį, šuniuką, triušį, triušiuką, žiurkėną, jūrų kiaulytę, papūgą, papūgėlę, kanarėlę, auksinę žuvelę,
vėžlį, karvę, veršelį, jautį, bulių, arklį, kumelę, kumeliuką, ponį, asilą, mulą, kiaulę, paršelį, paršiuką, avį, aviną,
ėriuką, ožką, ožį, ožiuką, vištą, viščiuką, gaidį, antį, ančiuką, žąsį, žąsiuką, kalakutą, balandį, šinšilą, žiurkę, pelę,
pelytę, lapę, lapiuką, vilką, vilkiuką, mešką, meškiuką, rudąjį lokį, baltąjį lokį, kiškį, kiškiuką, ežį, ežiuką, voverę,
voveraitę, voverę skraiduolę, burunduką, bebrą, briedį, elnią, šiaurės elnią, stirną, stirniuką, šerną, barsuką, kiaunę,
šešką, žebenkštį, audinę, ūdrą, jūrų ūdrą, lūšį, kurmį, varlę, rupūžę, buožgalvį, gyvatę, žaltį, driežą, salamandrą,
tritoną, šikšnosparnį, pelėdą, pelėdžiuką, apuoką, genį, gegutę, varną, šarką, kėkštą, zylę, žvirblį, kregždę,
lakštingalą, gandrą, garnį, gervę, gulbę, kirą, žuvėdrą, vanagą, erelį, sakalą, pempę, vieversį, strazdą, varnėną, kuosą,
kurapką, fazaną, tetervinį, kormoraną, liūtą, liūtuką, tigrą, tigriuką, dramblį, drambliuką, žirafą, zebrą, beždžionę,
gorilą, šimpanzę, orangutaną, lemūrą, kengūrą, koalą, pandą, raganosį, begemotą, krokodilą, aligatorių, kupranugarį,
lamą, alpaką, bizoną, stumbrą, jaką, antilopę, gazelę, okapį, tapyrą, mufloną, kalnų ožį, ožiaragį, leopardą, gepardą,
jaguarą, pumą, panterą, hieną, šakalą, kojotą, dingą, meškėną, usūrinį šunį, skunksą, oposumą, vombatą, ančiasnapį,
echidną, tinginį, skruzdėdą, šarvuotį, dygliakiaulę, surikatą, mangustą, lemingą, flamingą, tukaną, pingviną, strutį,
kolibrį, povą, pelikaną, albatrosą, arą, kakadu papūgą, ibį, ruonį, ruoniuką, jūrų liūtą, vėplį, banginį, kašalotą,
orką, narvalą, delfiną, ryklį, aštuonkojį, kalmarą, medūzą, jūrų žvaigždę, jūrų ežį, krabą, omarą, krevetę, sraigę,
šliužą, jūrų arkliuką, menkę, lašišą, lydeką, ešerį, karpį, plekšnę, ungurį, piraniją, kardžuvę, vėžį, jūrų vėžlį,
varaną, chameleoną, iguaną, kobrą, pitoną, bitę, kamanę, vapsvą, širšę, drugelį, kandį, laumžirgį, boružę,
skruzdėlę, žiogą, svirplį, musę, uodą, vorą, vabalą, karkvabalį, elniavabalį, jonvabalį, slieką, vikšrą, šimtakojį,
dinozaurą, tiranozaurą, triceratopsą, stegozaurą, brontozaurą, pterodaktilį, mamutą, drakoną, vienaragį
`;

const TRANSPORT = `
automobilį, lenktyninį automobilį, sportinį automobilį, ralio automobilį, senovinį automobilį, elektromobilį,
policijos automobilį, greitosios pagalbos automobilį, gaisrinės automobilį, pašto automobilį, ledų furgoną,
techninės pagalbos automobilį, taksi, kabrioletą, limuziną, visureigį, pikapą, furgoną, mikroautobusą, kemperį,
autobusą, dviaukštį autobusą, mokyklinį autobusą, troleibusą, tramvajų, traukinį, garvežį, prekinį traukinį,
greitąjį traukinį, metro traukinį, vienbėgį traukinį, funikulierių, sunkvežimį, sunkvežimį su priekaba, vilkiką,
autovežį, cisterną, savivartį, ekskavatorių, buldozerį, kraną, autokraną, betonvežį, krautuvą, kelio volą,
šiukšliavežį, sniego valytuvą, traktorių, kombainą, motociklą, motorolerį, mopedą, kvadraciklą, sniegaeigį, kartingą,
bolidą, dviratį, tandemą, triratį, paspirtuką, elektrinį paspirtuką, riedlentę, riedučius, rogutes, roges,
vaikišką vežimėlį, neįgaliojo vežimėlį, lėktuvą, keleivinį lėktuvą, sraigtasparnį, sklandytuvą, hidroplaną, raketą,
kosminį laivą, kosminę stotį, mėnuleigį, skraidančią lėkštę, oro balioną, dirižablį, keltuvą, laivą, valtį,
irklinę valtį, motorinę valtį, gelbėjimo valtį, burlaivį, jachtą, keltą, baržą, povandeninį laivą, katerį, baidarę,
kanoją, plaustą, gondolą, vandens motociklą, ledlaužį, piratų laivą, kruizinį laivą, vežimą, karietą
`;

const HOUSEHOLD = `
puodelį, puodą, keptuvę, šaukštą, arbatinį šaukštelį, šakutę, lėkštę, dubenėlį, stiklinę, ąsotį, arbatinuką, virdulį,
kavinuką, šaldytuvą, viryklę, orkaitę, mikrobangų krosnelę, skrudintuvą, maišytuvą, trintuvą, kočėlą, sietelį, tarką,
samtį, mentelę, druskinę, cukrinę, duoninę, padėklą, servetėlę, staltiesę, indaplovę, kriauklę, čiaupą, prijuostę,
virtuvės laikrodį, pieno ąsotėlį, sausainių dėžutę, termosą, priešpiečių dėžutę, butelį, gertuvę, stalą, kėdę, fotelį,
sofą, lovą, spintą, komodą, lentyną, knygų lentyną, naktinį staliuką, veidrodį, lempą, toršerą, šviestuvą, kilimą,
užuolaidas, pagalvę, antklodę, čiužinį, kabyklą, pakabą, taburetę, suolą, supamąją kėdę, hamaką, lopšį, vaikišką lovelę,
rašomąjį stalą, žurnalinį staliuką, batų lentyną, žaislų dėžę, dantų šepetėlį, dantų pastą, muilą, muilinę,
rankšluostį, vonią, dušą, klozetą, kempinę, šampūną, šukas, plaukų šepetį, plaukų džiovintuvą, guminę antytę,
vonios kilimėlį, skalbinių krepšį, kepurę, žieminę kepurę, šaliką, pirštines, kumštines pirštines, kojines, batus,
batelius, guminius batus, sportbačius, šlepetes, marškinėlius, marškinius, megztinį, džemperį, striukę, paltą,
lietpaltį, suknelę, sijoną, kelnes, šortus, pižamą, maudymosi kostiumėlį, kaklaraištį, peteliškę, diržą, skrybėlę,
kepurę su snapeliu, akinius, akinius nuo saulės, rankinį laikrodį, apyrankę, karolius, žiedą, plaukų segtuką,
plaktuką, atsuktuvą, reples, pjūklą, kirvį, vinį, varžtą, veržliaraktį, gręžtuvą, matuoklę, kastuvą, grėblį, kibirą,
laistytuvą, karutį, kopėčias, žoliapjovę, gėlių vazoną, sodo žirkles, šluotą, semtuvėlį, dulkių siurblį, šluostę,
skalbimo mašiną, lygintuvą, lyginimo lentą, skalbinių džiovyklą, skalbinių segtuką, pieštuką, spalvotus pieštukus,
flomasterį, tušinuką, kreideles, trintuką, drožtuką, liniuotę, žirkles, klijus, sąsiuvinį, knygą, kuprinę, penalą,
teptuką, dažus, molbertą, gaublį, skaičiuotuvą, segtuvą, sąvaržėlę, lipnią juostą, kalendorių, voką, laišką,
atviruką, televizorių, kompiuterį, nešiojamąjį kompiuterį, planšetę, telefoną, mobilųjį telefoną, ausines,
kolonėlę, radiją, fotoaparatą, nuotolinio valdymo pultelį, žadintuvą, sieninį laikrodį, ventiliatorių, stalinę lempą,
žibintuvėlį, lemputę, rozetę, jungiklį, kamuolį, futbolo kamuolį, krepšinio kamuolį, lėlę, pliušinį meškiuką,
kaladėles, dėlionę, žaislinę mašinėlę, aitvarą, jojo, vilkelį, būgną, gitarą, dūdelę, ksilofoną, pianiną, smuiką,
trimitą, akordeoną, varpelį, švilpuką, supynes, čiuožyklą, smėlio dėžę, kibirėlį, kastuvėlį, balioną, šokdynę,
lanką, badmintono raketę, teniso raketę, riedlentės šalmą, šachmatus, kauliuką, žaidimų kortas, skėtį, raktą, spyną,
duris, langą, žvakę, žvakidę, vazą, paveikslą, nuotraukų rėmelį, krepšį, pintinę, lagaminą, piniginę, rankinę,
dėžę, šiukšliadėžę, siūlus, adatą, sagą, mezgimo virbalus, siūlų kamuolį, žirklutes, siuvimo mašiną, kilimėlį,
kalėdinę eglutę, dovaną, žibintą, dūmų detektorių, gesintuvą, termometrą, pleistrą, vaistinėlę, svarstykles, inkilą,
lesyklėlę, šuns būdą, katės dubenėlį, akvariumą, narvelį, gėlę vazone, kaktusą, palapinę, miegmaišį, žibalinę lempą,
kompasą, žiūronus, didinamąjį stiklą, laikrodį su gegute, smėlio laikrodį, metronomą, mikrofoną, kamerą, lazdą,
kėdutę, pufą, dviaukštę lovą, sieninę lentyną, laiptus, tvorą, vartus, pašto dėžutę, varpą, žvaigždę ant eglutės, žaislinį traukinuką
`;

const parse = (list) => [...new Set(list.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))];

export const DRAW_CATEGORIES = [
  { id: 'gyvunai', label: 'Gyvūnai', items: parse(ANIMALS) },
  { id: 'transportas', label: 'Transportas', items: parse(TRANSPORT) },
  { id: 'daiktai', label: 'Daiktai', items: parse(HOUSEHOLD) },
];

/** Garso failo vardas iš teksto: be lietuviškų raidžių, tarpai – „_“ (pvz. „šakalą“ → „shakala“, kad nesutaptų su „sakalą“). */
export function drawId(text) {
  const map = { ą: 'a', č: 'ch', ę: 'e', ė: 'e', į: 'i', š: 'sh', ų: 'u', ū: 'u', ž: 'zh' };
  return text
    .toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (c) => map[c])
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export const ALL_DRAW_ITEMS = DRAW_CATEGORIES.flatMap((c) => c.items);
