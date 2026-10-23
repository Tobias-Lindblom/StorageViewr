# StorageViewr UI-system

## Audit 2026-10-15

Genomgången visade att PWA-skalet, safe-area-hanteringen och den interna
scrollmodellen redan var stabila. De tydligaste bristerna var ett för litet
färgsystem, många hårdkodade gradienter, varierande radier och kontrollhöjder,
samt flera parallella varianter av listor, tomlägen och statusytor.

Redesignen använder därför ett semantiskt lager i `globals.css`: tre
yt-nivåer, subtil/normal/aktiv kant, primär/sekundär/dämpad text, tre
radier och en kontrollhöjd på 48 px. Äldre feature-klasser pekar mot samma
tokens så att visuella beslut inte behöver dupliceras i varje domän.

Lila är reserverat för primära handlingar, aktiv navigation och vald status.
Grönt, gult och rött används för semantisk återkoppling. Långa listor använder
sammanhållna ytor och separators, medan dashboardens KPI:er samlas i ett
gemensamt block. Glow och dekorativa gradienter hålls borta från vanliga kort.

StorageViewr utgår från de kompakta mobilvyerna: mörk bakgrund, diskreta
lila ytor, tunna kanter och tydliga lila primäråtgärder. Desktop använder
samma komponenter med mer utrymme, inte ett separat formspråk.

## Gemensamma byggstenar

- Typsnittet laddas en gång i appens root via `src/app/fonts.ts`.
  Sidor, formulär, dropdown-menyer och portaler ärver samma Roboto.
- Färgerna i `@theme` i `globals.css` är gemensamma. Lila används för
  navigation och åtgärder, grönt för verifiering/inleverans, rött för fel
  och fel, gult för varningar, cyan för saldon.
- `PageHeading` använder 22 px på mobil och 28 px på desktop.
  Formulärsektioner använder `form-section-heading` på 14 px.
- `button`, `button-secondary` och vanliga formulärfält har minst
  44 px höjd och 8 px hörnradie. Textfält använder 16 px för läsbarhet
  och iOS-fokus. Befintliga kompakta liståtgärder behåller sina mått.
- `form-card` och `panel` använder 10 px hörnradie, tunna kanter och
  16–20 px inre avstånd. `editor-form` och `form-actions` håller
  avstånden mellan sektioner och knapprader konsekventa.
- `choice-chip` visar valt läge via `aria-pressed` eller `aria-checked`.
  Både lagerhändelser och CSV-import använder samma visuella val.
- `notice`, `notice-success`, `notice-warning` och `error` ger
  gemensamma meddelandestilar. Status ska även framgå i text.
- `BottomSheet` äger rubrik, handtag, innehållsyta och eventuell footer.
  Använd dess gemensamma avstånd i stället för separata panelramar.
  Mer och skannern behåller sina specialiserade innehållsvyer.

## Layout och funktion

Root-dokumentet är låst; appens main och panelernas innehåll sköter scroll.
Safe-area, fokusmarkering, modal fokusfälla, draghandtag, tangentbordsstöd
och reducerad rörelse ska bevaras vid framtida stiländringar.
QR-etiketternas vita utskriftsyta är avsiktlig.

Genomgången 2026-10-15 omfattar huvudvyer, skapa/redigera, import,
inställningar, inventeringsräkning, filter, lagerhändelser, navigation,
inloggning/registrering, fel- och offlinevyer. Affärsregler och API:er
har inte ändrats. Installerad iPhone-PWA behöver fortfarande kontrolleras
på fysisk enhet; Chrome-emulering verifierar inte native iOS-beteende.

## Styckvärde och lagervärde

Produkter kan ha ett valfritt styckvärde i SEK, angivet i Ny produkt eller
Redigera produkt. Fältet accepterar komma eller punkt och högst fyra decimaler,
till exempel 0,8451 kr. Tomt fält betyder att värdet saknas; noll är ett
uttryckligt värde.

Produktsidans saldokort visar styckvärde och totalt lagervärde för samma
lagerplatser som ingår i totalt saldo. Totalen beräknas från aktuellt
styckvärde × aktuellt antal och uppdateras efter lagerhändelser. Styckvärdets
fyra decimaler används i hela beräkningen och totalsumman avrundas därefter
till två decimaler. Det är ett aktuellt beräknat värde, inte historisk
inköpsvärdering.

Databas/API använder det valfria fältet unitValue som en normaliserad
decimalsträng med fyra decimaler eller null. Befintliga värden i det tidigare
fältet unitValueOre läses med oförändrat belopp och flyttas när styckvärdet
redigeras. Utelämnat fält i äldre uppdateringsanrop bevarar ett redan angivet
värde; null tar bort det. Beräkningen använder heltal/BigInt i enheter om
1/10 000 krona för att undvika flyttalsfel.
