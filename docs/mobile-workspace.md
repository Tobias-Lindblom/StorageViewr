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

1. Saldosammanfattningar per produkt och lagerplats, `StatusBadge`, `QuickActions`,
   `InventoryVerification` och delade namn för lagerhändelser. Befintliga färger används, med
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
skannerpanelen. QR-adresser kontrolleras mot konfigurerad APP_URL och
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

Lagerplatslistan följer nu mobilreferensen med samma kompakta sökfält,
filterchips och primärknapp som produktlistan. En rak kortlista visar platskod,
lager, antal produkter, exakt enhetssumma och Upptagen/Tom. Upptagen bygger på
befintliga placeringar, även när en placerad produkt har saldo noll. Inaktiva
platser kan väljas i administratörens filterpanel. Chipantal följer sökning,
valt lager och platsstatus och påverkas inte av valt beläggningschip.

Lagerfilter, QR-etiketter och PDF-rapport nås via filterknappen. Exportverktygen
behåller den tidigare avgränsningen till valt lager eller alla lager. Ny lagerplats
öppnar det befintliga formuläret med antal 1; batchskapande finns kvar. Vyn för
ett enskilt lager behåller sin grupperade lista och tidigare batchförval 10.
En organisation utan lager kan fortfarande skapa sitt första lager.

Lint, typkontroll, alla 73 tester, produktionsbygge och diff-kontroll godkändes.
Chrome verifierade 320, 390, 768, 1024 och 1440 px samt 17 flöden: beläggningschips,
sökning, nollsaldo på upptagen plats, tomt sökresultat, filter/fokus, lagerfilter,
inaktiva platser, QR-etiketter, PDF, skapande av en plats, platslänk, befintligt
batchskapande, långa namn/stora exakta saldon, lagerpersonalens behörigheter,
främmande lager och första lagret i tom organisation. Skärmbilder och resultat
finns i `storageviewr-mobile-5ttcTk` i den lokala temporära katalogen. Kontrollen
använde isolerade testkonton och en temporär databas.

Lagerplatsens detaljsida följer nu referensen med Tillbaka/trepunktsmeny i
mobilvyn, platskod/lager och Redigera plats i headern, små platsdelstaggar,
ett gemensamt produkt-/enhetskort, klickbart inventeringskort och kompakta
produktrader. Inventera plats ligger under Snabbåtgärder, ovanför Inleverans,
Uttag och Flytta. Administratörens korrigering är fortsatt tillgänglig via
åtgärdsvalet i befintlig StockEditor. Placera med nollsaldo finns kvar.
QR-kod och platsuppgifter samt befintlig borttagningsbekräftelse nås via menyn.
Den direkta QR-vyn använder samma detaljlayout när ingen inventering pågår.

Senaste aktivitet är platsavgränsad och återanvänder dashboardens uppföljning:
saldohändelser och avslutade fysiska kontroller utan saldoändring visas som
händelser respektive INV. Inventeringskorrigeringar dubbelvisas inte för samma
avslutade platskontroll. Lagerpersonal får bara inventeringsaktivitet och
behåller serverns begränsning av saldohistoriken. Redan hämtade saldohändelser
återanvänds i uppföljningen; inga duplicerade inventeringsfält sparas.

Lint, typkontroll, 74 tester, produktionsbygge och diff-kontroll godkändes.
Det nya integrationstestet kontrollerar plats-/företagsavgränsning,
deduplicering, återanvända händelser, pågående kontroller och worker-behörighet.
Chrome verifierade fem skärmbredder och 18 flöden: inventeringsdetaljer/fokus,
QR/fokus, borttagningsbekräftelse/avbryt/fokus, redigering med stabil QR-token,
QR-ruttens layout, de tre snabba lageråtgärderna och befintlig korrigering,
ändrat saldo, produktlänk, nollplacering och ofullständig kontroll,
förvald/startad inventering, fortsatt pågående inventering, långa namn/exakta
stora saldon, ej inventerad plats, återgång till listan och lagerpersonalens
behörigheter. Skärmbilder och resultat finns i `storageviewr-mobile-v3V5a6`
i den lokala temporära katalogen. Kontrollen använde en isolerad testdatabas.

Historiken följer nu referensen med rubriken Historik, kompakt sökfält och
filterknapp, chips för Alla/Inleverans/Uttag/Flytt/Inventering och täta
händelserader med färgade cirklar, plats och tid. Korrigeringar kan filtreras
i panelen. Header och markerad historikflik återanvänder den gemensamma
designen med profilcirkel och Mer/trepunktsikon. Sidindelningen använder
produktlistans kompakta kontroller.

Varje rad öppnar en detaljpanel med produkt/SKU, lager/plats, tid, utförare,
orsak och saldo före/efter. Flyttar grupperas före sökning och sidindelning,
så båda riktningarna hör ihop på en sida; platsavgränsad historik behåller
den enskilda platsens riktning och tecken. Avslutade platskontroller visas
även utan saldoändring, och deras korrigeringar samlas i samma händelse.
Befintliga revisionsposter och API:ets två flyttposter bevaras. Sökning och
filter utförs på servern inom valt företag; produkt/plats följer med mellan
filter och sidor. Lagerpersonalens tidigare behörigheter behålls.

Lint, typkontroll, 76 tester, produktionsbygge och diff-kontroll godkändes.
Två nya integrationstester verifierar gruppering före sidindelning,
bokstavlig sökning, tenant-/rollavgränsning och avslutade inventeringar.
Chrome verifierade fem skärmbredder och 15 flöden, inklusive detaljpaneler,
fokusåterställning, inventeringslänk, sökning/chips, sidindelning,
produkt-/platsavgränsning, korrigeringsfilter, långa namn/stora exakta tal
och lagerpersonalens behörigheter. Inga ohanterade webbläsarfel upptäcktes.
Skärmbilder och resultat finns i `storageviewr-mobile-LDW0kr` i den lokala
temporära katalogen. Kontrollen använde en isolerad testdatabas.

Inventeringsöversikten använder nu samma kompakta rubrik, statuschips,
mindre lila startknapp och kortstil som produkt- och lagerplatslistorna.
Pågående inventeringar visar lager, datum, räknade platser och en tunn
förloppslinje. Genomförda inventeringar använder samma kort med grön
status och sparat avslutsdatum. Tomlägen och sidindelning följer samma stil.
Båda statusvyerna delar InventoryOverview; startknappen återfår fokus när
startpanelen stängs. Befintliga start-/räkningsflöden och behörigheter bevaras.

Lint, typkontroll, alla 76 tester, produktionsbygge och diff-kontroll godkändes.
Chrome verifierade tom, pågående och genomförd lista på fem skärmbredder
(15 vyer), plus 13 flöden: avslutad inventering/PDF, startpanel och valkrav,
fokusåterställning, start med förvald räkningsplats, fortsatt inventering,
delvis/fullständigt framsteg, statusnavigation, långa namn, sidindelning
och lagerpersonalens startförbud/fortsatta räkning/genomförda inventeringar.
Inga ohanterade webbläsarfel upptäcktes. Skärmbilder och resultat finns i
`storageviewr-mobile-3FGkQa` i den lokala temporära katalogen.
Kontrollen använde en isolerad testdatabas.

Lageröversikten följer nu den gemensamma kompakta liststilen med mindre
rubrik, lagerantal och mindre lila knapp. Varje lagerkort visar lagerikon,
namn, kod, antal aktiva platser och en synlig statusetikett. Aktiva och
inaktiva lager behåller sin tidigare sortering och synlighet per roll.
Tomläget använder samma lilla kortformat och en enda knapp för första lagret.
Befintlig lagerdetalj, skapande/redigering och backendavgränsning återanvänds.

Lint, typkontroll, alla 76 tester, produktionsbygge och diff-kontroll godkändes.
Chrome verifierade lista, långa namn och tom organisation på fem
skärmbredder (15 vyer), plus 13 flöden: kompakta kort, aktiva platsantal
inklusive en/noll platser, status, tenantavgränsning, detaljlänk,
skapandepanel/fokusåterställning, skapa med normaliserad kod, redigering,
dubbelkodsfel, långa namn, lagerpersonalens synlighet/behörigheter och
första lagret i tom organisation. Inga ohanterade webbläsarfel upptäcktes.
Skärmbilder och resultat finns i `storageviewr-mobile-bGz1IC` i den lokala
temporära katalogen. Kontrollen använde en isolerad testdatabas.

Den separata lagerdetaljsidan är nu ersatt av en 307-omdirigering till
lagerplatslistan filtrerad på lagret. Ägarskap och rollkontroll utförs före
omdirigeringen; ogiltiga/främmande lager och inaktiva lager för lagerpersonal
ger fortsatt 404. Lagerkort länkar direkt till den filtrerade listan.
Administratörens trepunktsmeny ligger bredvid kortlänken och öppnar befintlig
lagerredigering i en panel. Escape, klick utanför och fokusåterställning
stöds. Redigering uppdaterar lageröversikten; skapande av lager leder direkt
till dess lagerplatser, även via det fristående formuläret.

Den valda lagerplatslistan visar lagerkontext och länk tillbaka till Lager.
Platsformuläret begränsas till det valda aktiva lagret och behåller möjligheten
att skapa upp till 100 platser. Inaktiva lager saknar skapandeknapp och visar
sina inaktiva platser i administratörens direktöppnade vy. Tomma valda lager
får ett relevant tomläge. QR-etiketter och PDF finns kvar i filterpanelen
med lageravgränsningen bevarad. Den oanvända grupperade LocationList har
tagits bort. Äldre redigeringslänkar fungerar fortsatt och återgår till Lager.

Lint, typkontroll, alla 76 tester, produktionsbygge och diff-kontroll godkändes.
Chrome verifierade lagerkort och filtrerad lagerplatslista på fem bredder
(10 vyer), plus 17 flöden: direktlänk, separata meny-/länkmål, Escape/klick
utanför, tangentbordsöppnad redigering, återställt fokus, sparad redigering,
dubbelkodsfel, synligt valt lager, gamla länkar/307, tenantvalidering,
lageravgränsad PDF/QR, skapande av flera platser, inaktivt lager,
tomt lager, skapande via panel och fristående formulär samt lagerpersonalens
synlighet/redirectbehörigheter. Inga ohanterade webbläsarfel upptäcktes.
Skärmbilder och resultat finns i `storageviewr-mobile-iZGAz8` i den lokala
temporära katalogen. Kontrollen använde en isolerad testdatabas.

Inventeringens detaljsida följer nu produkt-/lagerplatsdetaljernas kompakta
layout. Mobilvyn använder Tillbaka och inventeringskontext i stället för
den gemensamma headern och bottennavigationen; desktop behåller dem.
Headern visar namn/lager, sparade datum och status. Framstegskortet visar
räknade platser, procent, återstående platser och avvikelser. Lagerplatser
visas i separata små kort med status Ej räknad/Räknad/Räkna om.

Genomförda inventeringar använder samma layout med grön framstegslinje,
expanderbara platskort och kompakta produktresultat (förväntat/räknat/avvikelse).
PDF-knappen följer den gemensamma lila åtgärdsstilen. Granskningen använder
mindre sammanfattnings- och avvikelsekort. CountPlace, QR-verifiering,
bekräftelser, revisioner och serverns behörigheter återanvänds.
Tillbaka-länken uppdateras vid slutförande, och fokus går till rubriken när
den tidigare åtgärdsknappen har ersatts av PDF-knappen. Omräkning och
slutförande behåller sina befintliga bekräftelsekrav.

Lint, typkontroll, alla 76 tester, produktionsbygge och diff-kontroll godkändes.
Chrome verifierade ej räknad, delvis räknad, genomförd och ändrat saldo på
fem bredder, plus långa namn/stora exakta antal (25 vyer), och 18 flöden:
mobil-/desktopnavigation, platsdialog/fokus, QR-förvald verifierad plats,
sparad räkning utan saldoändring, blockerad ofullständig granskning,
omräkningsbekräftelse, fullständig granskning/bekräftelse, genomförande och
korrekt saldouppdatering, dynamisk Tillbaka/fokus, expanderade produktresultat,
PDF, blockerad avslutning vid ändrat saldo, tom genomförd plats, långa namn
och exakta antal, lagerpersonalens tomräkning/granskning och avslutsförbud
samt ogiltig platsavgränsning. Inga ohanterade webbläsarfel upptäcktes.
Skärmbilder och resultat finns i `storageviewr-mobile-BU6B5k` i den lokala
temporära katalogen. Kontrollen använde en isolerad testdatabas.

## Skanning som bottomsheet

Skanningsknappen i navigationen och dashboardens snabbknapp öppnar samma
panel ovanpå den aktuella sidan. Kameravy, lila QR-ram, manuell platskod och
lagerval vid dubbla koder finns i samma panel. Den äldre /scanner-adressen
omdirigerar till dashboarden med skanningspanelen öppen.

Kameran stoppas när stängningsanimationen börjar, vid avläsning och när
sidan hamnar i bakgrunden. Pågående uppslag avbryts vid stängning. Sena
kameratillstånd och API-svar får inte återstarta kameran eller navigera.
Escape, dragning nedåt, fokusåterställning och tangentbordsnavigation stöds.
Inventeringens befintliga skanningsläge återanvänder fortfarande QrScanner.

Lint, typkontroll, alla 76 tester, produktionsbygge och diff-kontroll godkändes.
Chrome kontrollerade panelen på fem skärmbredder och 22 flöden, inklusive
faktisk jsQR-avkodning från simulerad kamerabild, nekad kamera, manuellt
uppslag, dubbla platskoder, inventeringsrouting, sena svar och lagerpersonal.
Inga ohanterade webbläsarfel upptäcktes. Resultat och skärmbilder finns i
`storageviewr-mobile-Xj48kU` i den lokala temporära katalogen.


## Städning efter designändringarna

Genomgången omfattade importkedjor i src, tester och databasskript,
exporterade symboler, CSS-klasser, ikonvarianter, publika filer, typsnitt,
konfiguration och beroenden. Next.js-sidor och Route Handlers behandlades
som egna ingångar, och dynamiska importer och CSS-klasser kontrollerades separat.

- Oanvända StockSummary och MovementList har tagits bort.
- Händelsernas gemensamma svenska namn finns nu i
  features/inventory/movement-label.ts och används av produktvyn och historiken.
- Ikonerna bell, menu och sparkle samt den oanvända publika SVG-filen har tagits bort.
- Interna konstanter, scheman och modelltyper exporteras bara när andra moduler behöver dem.
- LocationScanner har en enda aktuell layout; den överflödiga kompakt-parametern har tagits bort.
- Dashboardens tidigare plats-/produktnyckeltal, senaste-inventering-uppslag
  och separata antal pågående inventeringar har tagits bort. Lagerhälsa,
  inventeringsförslag, aktiva inventeringar och senaste aktivitet används fortsatt.
  Tester för dashboarden kontrollerar den nuvarande datan och tenantavgränsningen.

Efter städningen hittade importgenomgången inga kvarvarande oåtkomliga
TypeScript-moduler. Alla produktionsberoenden har användning i projektet.
De granskade CSS-klasserna behövs i aktuella vyer, inklusive klasser som
byggs dynamiskt för färg och status. Äldre länkar behåller sina omdirigeringar;
PWA-resurser, CSV-mall, PDF-typsnitt och licenser används fortfarande.

Verifiering efter städningen: lint, typkontroll, alla 76 integrationstester
och produktionsbygge godkändes. Chrome kontrollerade tio sidor på fem
skärmbredder (50 sidvyer), skannerpanelen på samma fem bredder och
skanningsflödena ovan. Lagerhälsans faktiska procent, produktens saldo och
händelsernas svenska namn verifierades särskilt. Inget horisontellt
överflöde eller ohanterat JavaScript-fel upptäcktes. Resultat och skärmbilder
finns i `storageviewr-mobile-f7RaPD` i den lokala temporära katalogen.
Kontrollen använde en isolerad testdatabas.

## Mer, profilmeny och fast PWA-layout

Mer har en egen kompakt bottomsheet med Översikt, Lager och Inventering,
korta beskrivningar och markering av aktuell sida. Profilmenyn är en separat
kompakt dropdown med konto, aktuellt företag, roll, inställningar, företagsbyte
och utloggning. Headern använder den runda profilcirkeln med initialer.
Kryssen i Mer och skanningspanelen är borttagna. Handtaget, dragning nedåt,
klick utanför och Escape stänger panelerna och återställer fokus.

Vid layoutgranskningen hade WorkspaceFrame redan 100dvh och separat main-scroll,
men html/body saknade ett permanent scrollås. Nu har html/body full viewport,
overflow: hidden och overscroll-behavior: none; body ligger fixed med inset: 0.
App-shell använder 100dvh med min-height: 0 och overflow: hidden. Main äger
content-scrollen och navigationen ligger utanför den. Scrollbara innerområden,
inklusive paneler och val-listor, har overscroll-behavior-y: contain.
Safe-area-avstånd och viewport-fit=cover används för iPhone.

AppViewport hanterar höjd och offset från VisualViewport när ett redigerbart
fält fokuseras och tangentbordet minskar den synliga ytan. Den scrollar det
fokuserade fältets innehållsyta, och återställer viewport-värden när tangentbordet
stängs eller fältet lämnas. Pinch-zoom behålls. En begränsad touch-kontroll stoppar
vertikala drag som inget scrollbart innerområde kan ta emot; textfält, markering,
horisontella gester och panelernas draghandtag behåller sina vanliga beteenden.
Ingen global touch-action: none används. Fokuserade fält använder minst 16px
på touch-enheter. Bakgrunden är låst medan en modal panel är öppen.

Även startsidan, inloggning, registrering, felsidor och offlinevyn har en egen
scrollbar innehållsyta. Utskriftsläget återställer normal dokumentlayout så att
alla QR-etiketter kan skrivas ut.

Bakgrund: [WebKits safe-area-dokumentation](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
och [visuell viewport vid tangentbord](https://developer.chrome.com/blog/viewport-resize-behavior/).

Verifierat med lint, läsande TypeScript-kontroll, alla 76 integrationstester
och det godkända produktionsbygget. Chrome verifierade tio app-sidor på fem
bredder, Mer och profilmenyn, runda avatarer, lång innehållsscroll med stabil
navigation, touch-gränser, interna panelscrollytor, simulerade tangentbordshöjder
och offsets, återställning efter blur/resize, formulärsparning, företagsbyte,
roller, långa namn, utloggning, publika formulär, offlinevy och QR-utskrift.
Skanningsflödena verifierades även inklusive faktisk jsQR-avkodning och kamerastopp.
Inga ohanterade webbläsarfel upptäcktes. Resultat och skärmbilder finns i
`storageviewr-mobile-vDJKJ8` i den lokala temporära katalogen.
Testerna använde en isolerad databas.

Installerad iPhone-PWA har inte verifierats på fysisk enhet i denna Windows-miljö.
Kontrollera där efter omladdning:

1. Kort dashboard: dra upp/ned över innehåll och navigation; hela appen ska ligga stilla.
2. Lång produktlista: scrolla till båda ändarna; endast innehållet ska röra sig.
3. Navigation: den ska ligga kvar även vid innehållsscroll och safe-area-avståndet ska synas.
4. Bottomsheet: scrolla en lång inventeringspanel; bakgrunden ska behålla sin position.
5. Tangentbord: skriv i produktsökning, profilinställningar och manuell skanning,
   stäng tangentbordet, upprepa och rotera telefonen; inga fält ska blockeras
   och ingen permanent tom yta ska bli kvar.
