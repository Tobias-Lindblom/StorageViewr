# StorageViewr: mobil arbetsyta och saldokvalitet

## Audit av befintlig kod

Projektet använder Next.js App Router, React, TypeScript, Mongoose/MongoDB och Zod.
Det fanns redan ett mörkt tema, persistent mobilnavigation, dialogpaneler,
produktsökning, saldon på flera platser, lagerhändelser och inventeringssessioner.

- `Product`: SKU, namn, streckkod, beskrivning, bild och aktiv status. Saknar gräns för lågt saldo.
- `Location`: lager, zon, sektion, position, platskod och stabil QR-token.
- `InventoryLevel`: antal och saldoversion per organisation, produkt och plats.
- `InventoryMovement`: historisk händelse, antal före/efter, utförare, inventerings- och flyttreferenser.
- `InventorySession`: pågående/avslutad inventering.
- `InventorySessionLocation`: urval och bekräftelse av hela platser, även tomma platser.
- `InventoryCount`: förväntat/räknat antal, förväntad version, avvikelse, räknare och tid.

Befintliga lagerflöden finns i `features/inventory/service.ts` och
`features/inventory/sessions.ts`. De behåller transaktioner, versionskontroll,
serverbehörighet, Zod-validering och organisationens scope.

## Genomförda steg

1. Gemensamma komponenter: `StockSummary`, `StatusBadge`, `QuickActions`,
   `InventoryVerification` och `MovementList`. Befintliga färger används, med
   semantiska tokens för success, warning och destructive.
2. Produktlistan visar SKU, exakt summerat saldo och antal placeringar.
   Lagerfilter tillämpas före sidindelning. Namn, SKU och streckkod är fortsatt sökbara.
3. Produktdetaljen prioriterar bild/identitet, saldo, fysisk kontroll,
   placeringar, direkta lageråtgärder och senaste händelser.
4. Lagerplatsdetaljen visar platsens delar, enheter, produkter med bilder,
   fysisk kontroll och primär inventeringsknapp. Startdialogen förväljer platsen.
5. Mobilnavigation: Produkter, Platser, Skanna, Historik, Mer. Desktop har sidebar.
   Mer har en trepunktsikon och visar endast Översikt, Lager och Inventering.
   Konto, företag och utloggning nås separat via profilcirkeln i headern.
6. Dashboarden följer mobilreferensen: välkomsttext, Lagerhälsa med procentuell ring,
   dagens inventeringsförslag, fyra fungerande snabbknappar och tre senaste aktiviteter.
   Headern har fylld kub och profilcirkel; mobilnavbaren har en upphöjd skannerknapp.

## Hur verifieringen fungerar

Inga inventeringsfält har lagts till i produkt-, plats- eller saldomodellerna.

Kontrollen härleds från avslutade sessioner och deras historiska räkningsrader.
Pågående räkningar ger inte verifierad status. Alla aktuella placeringar behöver
ha en räkning, rätt antal och rätt version. Vid avslut ökar saldoversionen endast
för korrigerade rader; detta tas med i jämförelsen.

För produkter hämtas senaste avslutade kontroll per placering. Datumet avser
den äldsta kontrollen bland aktuella räknade placeringar, så en ny kontroll av
en enda plats inte gör hela produkten färsk. Platser hämtar senaste avslutade
platskontroll; även tomma platser kan vara verifierade.

Efter 30 dagar visas behov av verifiering. Ändrat saldo och ofullständig kontroll
har egna textstatusar. Historiska avvikelser i avslutade sessioner beskrivs som
korrigerade; de behandlas inte som öppna avvikelser.

Lagerhälsans procent är andelen aktiva produkter där alla placeringar har räknats
under de senaste 30 dagarna och antal/versioner fortfarande matchar räkningarna.
Produkter utan fullständig aktuell kontroll behöver räknas. Fullständiga kontroller
äldre än 90 dagar visas separat. Samma befintliga historik och versionsregler används
som på detaljsidan; inga extra verifieringsfält sparas.

Dagens förslag förväljer upp till sju platser i samma lager. Tidsåtgången är en
ungefärlig planeringsuppskattning: 30 sekunder per plats och 15 sekunder per placerad
produkt, avrundat uppåt till hela minuter. Vid en pågående inventering visas i stället
räkningsframsteg och en knapp för att fortsätta.

Dashboardens inleverans, uttag och flytt söker produkter via befintligt API och
återanvänder StockEditor. Senaste aktivitet kombinerar lagerhändelser med avslutade
platskontroller, inklusive räkningar utan saldoändring. Lagerpersonal får fortsatt
endast inventeringsaktivitet; saldohistoriken behåller administratörsbehörighet.

## Dataåtkomst och behörighet

- Standardsökningen summerar bara produkterna på den aktuella sidan.
- Lagerfilter använder en gemensam aggregation för antal och aktuell resultatsida.
- Exakta heltal summeras via MongoDB Long/Decimal128 och skickas som strängar.
- Samtliga nya aggregationsfrågor och referensuppslag är organisation-skopade.
- Saldohistorik förblir administratörsbegränsad, även i detaljvyerna.
  Lagerpersonal har inventeringshistorik i mobilnavigationen.
- Korrigering, start och avslut av inventering förblir administratörsåtgärder.
- Lagerpersonal kan fortsatt registrera inleverans, uttag och flytt samt räkna platser.

Den gemensamma kamerakomponenten `QrScanner` används av både inventering och
den nya skannsidan. QR-adresser kontrolleras mot konfigurerad APP_URL och
platsen kontrolleras på servern. Manuell platskod kan ge ett lagerval när samma
kod förekommer i flera lager.

Befintliga routes behålls. Tillkommande routes:
- `/scanner`
- `POST /api/locations/scan`

`/inventory/history` och dess API kan nu även visa hela organisationens historik.
Produkt- och platsfilter fungerar fortsatt. Ett index har lagts till för detta:

`{ organizationId: 1, createdAt: -1, _id: -1 }`

Kör `npm run db:indexes` vid uppdatering av befintlig databas. Kommandot skapar
saknade index utan att ta bort befintliga index. Inga datamigreringar behövs.

## Avgränsningar

Lågt saldo kan inte definieras utan ett produktgränsvärde, så endast faktiskt
saldo 0 markeras som tomt. Hälsoprocenten använder verkliga räkningar och aktuella
saldoversioner; den är ingen statistisk prognos. Tidsestimatet är ungefärligt.
Ingen ny avvikelsemodell och inga ERP-, order-, inköps- eller fraktflöden ingår.

Fysisk kameraskanning på iPhone/Android med utskrivna etiketter behöver fortfarande
provas på riktiga enheter. Automatisk webbläsarverifiering använder simulerad kamera.

## Verifiering av slutversionen

- `npm run lint`: godkänd.
- `npm run typecheck`: godkänd.
- `npm test`: 73 av 73 tester godkända.
- `npm run build`: production build godkänd.
- `git diff --check`: godkänd.

Sju nya integrationstester kontrollerar exakta saldon och lagerfilter,
inventeringsstatus vid korrigering/ändring/åldrande, fullständig kontroll av alla
placeringar, scanner-avgränsning, organisationens historik och dashboardens uppföljning.

Den isolerade Chrome-kontrollen körde sju sidor vid 320, 390, 768, 1024 och
1440 px: produktlista, produktdetalj, lagerplatsdetalj, lagerplatslista, dashboard,
historik och scanner. Samtliga 35 vyer saknade horisontellt överflöde och hade rätt
navigation för skärmbredden.

Webbläsaren verifierade filterdialogen, inleverans, uttag, flytt och korrigering
genom de faktiska formulären och kontrollerade saldon efter varje sparning.
Inventering startades med rätt plats förvald och öppnade platsens räkning direkt.
Manuell skanning ledde till rätt pågående inventering. Lagerpersonal saknade
korrigeringsknapp och saldohistorik, och historik-API:t svarade med 403 för rollen.
Inga okontrollerade JavaScript-fel registrerades.

Kontrollen använde en temporär MongoDB replica set och ändrade inte den vanliga
databasen. Skärmbilder och resultat sparades i den lokala temporära katalogen
`storageviewr-mobile-HRAV4t`.

Dashboardens referenslayout verifierades även separat i samma webbläsarkörning:
hälsoringen motsvarade verkligt verifierade produkter i testdatabasen,
inventeringsförslaget förvalde sju rätta platser och rätt lager, inleverans/uttag
sparades genom dashboardens formulär och flytt valde rätt åtgärd. Profilcirkeln och
navbarens meny öppnade sina befintliga kontroller. Totalt kontrollerades 13 flöden.

Den slutliga förhandsbilden finns i `storageviewr-mobile-HRAV4t/390-dashboard.png`
under den lokala temporära katalogen. Bildens lageruppgifter är isolerade testdata.

De fyra efterföljande justeringarna verifierades vid 320, 390 och 1440 px:
ikonen under hälsoringen och headerns klocka är borttagna; Mer visar enbart
lagerlänkar med trepunktsikon. Profiluppgifter och kontoinställningar finns
endast i profilmenyn. Escape återställde fokus och Inventering-länken navigerade
korrekt. Lint, typkontroll och produktionsbygge godkändes igen.
Skärmbilder och kontrollresultat finns i `storageviewr-mobile-kzQSd5` i den
lokala temporära katalogen.

Produktlistan har därefter anpassats till referensen: kompakt sökfält med
filterikon, chips för Alla/I lager/Slut, Ny produkt och täta rader med bild,
SKU, exakt saldo och antal platser. Lågt saldo utelämnas enligt önskemål.
Produktstatus, utan lagerplats och CSV-import finns i filterpanelen.
Chipsens antal följer sökning och produktstatus, gäller hela resultatet och
beräknas med samma företags- och behörighetsavgränsning som produktlistan.
Sidnavigeringen använder samma mörka ytor, lila accenter och chevrons som listan,
med centrerat sidnummer och kompakta Föregående/Nästa-knappar.

Lint, typkontroll, 73 tester och produktionsbygge godkändes. Befintligt
integrationstest utökades för chipsens antal vid sökning, sidindelning,
inaktiva produkter och främmande företags saldorader. Chrome verifierade
320, 390, 768, 1024 och 1440 px, sökning, filter, produktlänkar, båda
sidknapparna, långa namn, stora saldon och lagerpersonalens behörigheter.
Skärmbilder och resultat finns i `storageviewr-mobile-D66aDx` i den lokala
temporära katalogen. Testdatabasen var isolerad från den vanliga databasen.

Produktsidan följer nu den separata detaljreferensen. Mobilvyn använder
Tillbaka och en meny för produktalternativ, utan den gemensamma headern och
bottom navigation; desktop behåller header och sidebar. Förbrukningsvara och
Visa karta utelämnas. Bild, SKU, streckkod, aktiv status och aktuellt antal
lagerplatser visas i produktheadern. Ett gemensamt kort visar exakt totalsaldo
och senaste avslutade inventering; datumkortet öppnar befintlig verifieringsinformation.
Produktuppgifter och redigering nås via trepunktsmenyn. Placera med nollsaldo
finns fortsatt vid lagerplatslistan. Hela lagerplatsraden är klickbar.

Snabbåtgärderna återanvänder StockEditor. De fyra senaste händelserna visas i
kompakta rader, och kompletta flyttpar presenteras som en händelse med riktning.
Flyttar mellan olika lager visar även lagernamnen. Ofullständiga par behåller
sin enskilda riktning; historiken och saldologiken ändras inte.

Lint, typkontroll, 73 tester och produktionsbygge godkändes. Flyttestet utökades
för sammanhängande par, ordningsoberoende riktning och enskilda historikrader.
Chrome verifierade fem skärmbredder samt 14 flöden: produktmeny och uppgifter,
inventeringsdialog och fokusåterställning, lagerplatslänk, de fyra lageråtgärderna,
kompakt historik, placeringsdialog, tillbaka, tom produkt, långa namn/stora saldon
och lagerpersonalens behörigheter. Skärmbilder och resultat finns i
`storageviewr-mobile-P1LLag` i den lokala temporära katalogen. Uppgifterna i
skärmbilderna kommer från en isolerad testdatabas.

Företagsvalet efter inloggning och sidan Skapa företag använder nu samma
WorkspaceFrame och WorkspaceHeader som lagerdelen: lokalt Roboto-typsnitt,
fylld kub, kompakt header och profilcirkel. Företag visas som separata kompakta
kort med namn, företagskod, medlemsroll, valt företag och chevron. Skapa företag
är en lila primärknapp. Tomkontovyn och det nya företagsformuläret följer samma
stilar; det befintliga redigeringsformuläret behåller sitt gränssnitt.

Lint, typkontroll, alla 73 tester och produktionsbygge godkändes. Chrome
verifierade företagsval och företagskapande vid 320, 390, 768, 1024 och 1440 px.
Faktisk inloggning ledde till företagsvalet, Enter öppnade rätt företag,
företagsbyte uppdaterade rollen, profilinställningar återställde fokus,
QR-returen öppnade rätt lagerplats och främmande företag nekades med 403.
Tomt konto, skapande genom formuläret, långa namn/koder och de befintliga
lagersidornas gemensamma header verifierades också. Auth-, medlemskaps- och
QR-logiken är oförändrad. Skärmbilder och resultat finns i
`storageviewr-mobile-h7f8K5` i den lokala temporära katalogen och använder
isolerade testkonton och en temporär databas.
