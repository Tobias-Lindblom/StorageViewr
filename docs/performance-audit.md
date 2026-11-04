# Prestandaaudit

Senast uppdaterad: 2026-11-04.

## Mål och mätmetod

Auditen omfattar serverns kritiska läsvägar, MongoDB-frågor, privat bildleverans,
App Router-streaming och JavaScript som skickas till mobilen. Lagerhistorik,
inventeringsräkningar och transaktionella saldoförändringar förblir källan till
sanningen. Tenantfilter, roller, versionskontroller och transaktioner har inte
luckrats upp.

Det finns ingen anonymiserad produktionsdump i repot. Backendvinster som inte kan
mätas representativt anges därför som ändrad frågestruktur, inte som uppskattade
procenttal. Kör med `PERFORMANCE_LOGGING=1` för JSON-loggar för
`dashboard.load`, dess deloperationer, `products.list`, `locations.list`,
`inventory.health` och `inventory.detail`. Loggarna innehåller operation och tid,
aldrig användar- eller företagsidentifierare.

## Baslinje och prioritering

### P0

1. Dashboarden väntade på sju setup-frågor innan produktsaldo, aktiva
   inventeringar, aktivitet och Lagerhälsa kunde fortsätta. Hela sidan väntade
   sedan på allt innehåll före första användbara vy.
2. Lagerhälsa läste alla historiska räkningsrader i organisationen och alla
   lagerrörelser efter den äldsta relevanta baslinjen. Breda dokument lästes trots
   att beräkningen använder ett litet antal fält.
3. Produktlistor hämtade samma privata WebP-bild på upp till 1200 pixlar och
   svarade med `private, no-store`, även när bilden visades som en liten miniatyr.

### P1

1. Sessionens medlemskap och organisation kontrollerades seriellt. Konto och
   organisation kunde också läsas flera gånger under samma serverrendering.
2. Produktlista, historik och inventeringslista gjorde `countDocuments` före
   sidfrågan. Den normala sidan betalade därför två databasrundor i serie.
3. Vanliga dashboardbesök laddade klientkod för skanner- och
   inleveransformulär innan användaren öppnade dem.
4. Dashboard-, inventerings- och aktivitetsfrågorna saknade sammansatta index för
   sina vanligaste tenant-, status- och sorteringsmönster.

### P2

1. Fritextsökning med case-insensitive regex över namn, SKU och streckkod kan
   inte använda produktens vanliga sorteringsindex effektivt. Detta behöver en
   separat sökstrategi först när verklig produktvolym motiverar den.
2. Den globala CSS-filen som byggs för appen är 196,1 kB okomprimerad. CSS är
   redan uppdelad i domänfiler men importeras globalt; routestyrd CSS bör utvärderas
   separat med visuell regression så att PWA-vyer inte tappar stil under navigering.
3. Lagerhälsa beräknas från historiken vid läsning. Materialisering kan bli
   motiverad vid större datamängder, men införs inte utan mätdata och en
   avstämningsmekanism.

## Genomförda ändringar

- Dashboardens oberoende frågor startar samtidigt som setup-frågorna.
  Lagerhälsa startar när den enda verkliga beroendedatan,
  `baselineEstablished`, finns.
- Dashboardens appskal renderas före den tyngre datan och visar ett måttstabilt
  Suspense-skelett. Innehållet strömmas in utan att navigationen behöver vänta.
- Lagerhälsa begränsar räknings-, avvikelse- och rörelsefrågor till produkt- och
  platsmängder som finns i aktuella aktiva positioner. Exakt produkt/platspar
  verifieras fortfarande i minnet, vilket bevarar tidigare semantik.
- Lagerhälsa och historik hämtar bara fälten de använder.
- Produkt-, historik- och inventeringslistor kör count och begärd sida parallellt.
  En andra sidfråga görs bara när ett gammalt sidnummer behöver klampas efter att
  datamängden har krympt.
- Dashboardens senaste aktivitet läser högst 20 smala rörelseposter direkt i
  stället för att anropa den paginerade historiken och räkna samtliga träffar.
- Session, konto och organisation dedupliceras request-lokalt med React `cache`.
  Medlemskap och organisation verifieras parallellt. Ingen tenantdata läggs i en
  delad cache.
- Nya produktfoton sparar både detaljbild och en 320-pixels WebP-miniatyr.
  Äldre poster fungerar genom en kompatibel miniatyrgenerering vid läsning.
- Bild-API:t verifierar session, medlemskap, tenant och produktstatus före ETag-
  svaret. `private, no-cache, must-revalidate` gör att webbläsaren kan återanvända
  bildbytes via `304` utan att en tidigare behörighet blir en långlivad åtkomst.
- Skannerpanelen, produktväljaren och inleveransformuläret laddas först när de
  öppnas.
- Index har lagts till för aktiva/slutförda inventeringar, dashboardaktivitet och
  sorterade lager-/platslistor. Kör `npm run db:indexes` före trafik efter
  driftsättning; kommandot tar inte bort befintliga index.

## Mätta resultat

| Område | Före | Efter | Resultat |
| --- | ---: | ---: | --- |
| Dashboardens initiala route-JS, produktionsbuild | 85 004 byte rå | 73 063 byte rå / 23 064 byte gzip | 14,0 % mindre rå JS; interaktionspanelerna ligger i separata chunks |
| Produktbild, syntetiskt 1200 × 900 RGB-prov | 711 122 byte detalj-WebP | 20 330 byte miniatyr-WebP | 97,1 % mindre bildpayload i provet |
| Tenantkontrollens seriella grupper efter sessionsdokumentet | användare → medlemskap → organisation | användare → max(medlemskap, organisation) | en seriell databasrunda borttagen |
| Normal produkt-/historik-/inventeringssida | count → page | max(count, page) | samma antal frågor, kortare kritisk väntkedja |

Bildprovet kördes lokalt med samma dimensioner och WebP-kvaliteter som
produktionskoden. Verklig minskning varierar med motivet. Backendlatens ska mätas
mot en produktionslik Atlas-datamängd via den opt-in-loggning som beskrivs ovan.

## Lagerhälsa: beslut och framtida materialisering

Materialisering införs inte nu. Den nuvarande modellen har tydliga och testade
regler för fysisk baslinje, obruten rörelsekedja, öppna avvikelser och manuella
korrigeringar. Att kopiera resultatet till en ny collection utan driftmätning skulle
öka risken för avvikelse mellan visning och historisk källa.

Ta upp beslutet igen om produktionsloggar visar återkommande hög P95 för
`inventory.health` eller om `explain("executionStats")` visar att tenantens
historiktillväxt dominerar trots de nya begränsningarna. En framtida modell bör då:

1. ha en unik rad per `organizationId + productId + locationId` med senaste
   baslinje, förväntat saldo, orsak, beräkningstid och källrevision;
2. uppdateras i samma transaction som slutförd inventering, rörelse och
   avvikelseändring;
3. behandlas som härledd data, aldrig som underlag för saldoskrivning;
4. ha ett idempotent avstämningsjobb som räknar om från InventoryCount,
   InventoryMovement och InventoryDiscrepancy och rapporterar skillnader;
5. kunna byggas om helt utan att ändra originalhistoriken.

## Kvarvarande verifiering

- Vercel-region kan inte fastställas från repot: varken lokal projektmetadata
  eller `vercel.json` finns. Kontrollera i Vercel Project Settings att Function
  Region ligger nära MongoDB Atlas primära region innan produktionstestet. Lägg
  inte in en region i kod förrän den faktiska Atlas-regionen är känd.
- Kör `explain("executionStats")` på de dokumenterade frågorna mot en
  produktionslik datamängd efter att de nya indexen skapats.
- Fysisk PWA-kontroll på iPhone/Android återstår för långsam anslutning,
  återgång från bakgrund och första öppningen av de nu lazy-loadade panelerna.
