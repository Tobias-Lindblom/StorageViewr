# StorageViewr – arkitektur och datamodell

## Avgränsning och första leverans

Målet är flödet organisation → lager → platser → produkter → placering → QR → inventering → avvikelser.
Vi bygger vertikalt och verifierar varje steg. Fas 1 omfattar registrering, inloggning, organisation,
medlemskap, säker tenant-kontext och organisationsinställningar. Inga påhittade dashboardtal.

## Struktur

- src/app: sidor och tunna Route Handlers.
- src/features/auth: registrering, inloggning och formulär.
- src/features/organizations: organisationslogik och inställningar.
- src/features/{warehouses,locations,products,inventory,scanner}: tillkommer i respektive fas.
- src/components: gemensamma gränssnittskomponenter.
- src/models: små Mongoose-modeller med infererade TypeScript-typer och explicita collections.
- src/lib/server: anslutning, sessioner, tenant-kontext, API-fel, requestskydd och rate limiting.
- src/validation: Zod för all extern input.
- tests: integrationstester mot en isolerad MongoDB replica set.

## Autentisering och tenant-gräns

E-post och lösenord i egen databas. Lösenord lagras med saltad scrypt.
En slumpmässig sessionstoken ligger i HttpOnly-cookie; bara SHA-256-hashen sparas i databasen.
Sessionen innehåller userId och aktivt organizationId. Rollen läses från Membership vid varje anrop.
Klientens organizationId är aldrig behörighetsbevis. Organisationsbyte verifierar medlemskap innan
aktiv organisation ändras i serverns session. Borttaget medlemskap tar omedelbart bort åtkomsten.
User är global identitet. Membership binder identitet till organisation och roll.
Organization är tenant-roten: dess \_id är tenant-id; den behöver inget redundant organizationId.
Sessions och rateLimits är säkerhetsdata, inte lagerdata.

Alla affärsfrågor kräver tenant-kontext från verifierad session. Även referenser måste verifieras:
en location och warehouse, eller product och inventoryLevel, måste tillhöra samma organisation.
Populate/aggregation får aldrig kringgå denna kontroll. Tenant-scoping är explicit i services,
inte ett dolt Mongoose-plugin. Admin kontrolleras på servern före mutationer.

## Collections och index

| Collection                | Viktiga fält                                                                                                                                    | Index                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| organizations             | name, slug, timestamps                                                                                                                          | slug unikt                                                                                             |
| users                     | email, name, passwordHash, timestamps                                                                                                           | normaliserad email unikt                                                                               |
| memberships               | organizationId, userId, role                                                                                                                    | (organizationId,userId) unikt; userId                                                                  |
| sessions                  | tokenHash, userId, organizationId?, expiresAt                                                                                                   | tokenHash unikt; expiresAt TTL                                                                         |
| rateLimits                | key, count, expiresAt                                                                                                                           | key unikt; expiresAt TTL                                                                               |
| warehouses                | organizationId, name, code, address?, active                                                                                                    | (organizationId,code) unikt                                                                            |
| locations                 | organizationId, warehouseId, code, zone, shelf, position, qrToken, active                                                                       | (organizationId,warehouseId,code) unikt; qrToken unikt                                                 |
| products                  | organizationId, sku, name, barcode?, description?, imageUrl?, hasPhoto, active                                                                  | (organizationId,sku) unikt                                                                             |
| productPhotos             | organizationId, productId, data (WebP), timestamps                                                                                              | (organizationId,productId) unikt                                                                       |
| inventoryLevels           | organizationId, warehouseId, productId, locationId, quantity, version                                                                           | (organizationId,productId,locationId) unikt; (organizationId,locationId); (organizationId,warehouseId) |
| inventoryMovements        | organizationId, productId, locationId, type, previousQuantity, newQuantity, difference, performedBy, inventorySessionId?, reason?, createdAt    | (organizationId,productId,createdAt); (organizationId,locationId,createdAt)                            |
| inventorySessions         | organizationId, warehouseId, name, status, startedBy, startedAt?, completedAt?                                                                  | (organizationId,warehouseId,status)                                                                    |
| inventorySessionLocations | organizationId, inventorySessionId, locationId, status, completedBy?, completedAt?                                                              | (organizationId,inventorySessionId,locationId) unikt                                                   |
| inventoryCounts           | organizationId, inventorySessionId, productId, locationId, expectedQuantity, expectedVersion, countedQuantity, difference, countedBy, countedAt | (organizationId,inventorySessionId,productId,locationId) unikt                                         |

Verksamhetsmodellerna från warehouses och nedåt implementeras stegvis, inte i fas 1.
Zon är initialt en validerad kod på Location; en egen Zone-collection behövs först när zoner har
egna attribut/livscykler. inventorySessionLocations behövs för att frysa omfattningen och räkna
progress även för tomma platser. Antal är icke-negativa säkra heltal i första MVP:n.

## Inventering och samtidighet

1. Admin skapar/startar sessionen och dess omfattning av platser.
2. Räkningsvyn får aktuellt saldo och versionsnummer.
3. När räkningen sparas kontrolleras versionen. Vid saldoändring krävs omläsning och bekräftelse.
4. InventoryCount sparar immutable expectedQuantity för den accepterade räkningen, faktiskt antal
   och avvikelse. En omräkning före avslut kan ersätta räkningen, med tydlig användarbekräftelse.
5. Registrerad räkning ändrar inte InventoryLevel.
6. Admin avslutar efter granskning. En transaction kontrollerar nivåversioner, justerar saldo,
   skapar InventoryMovement och markerar sessionen avslutad. Konflikt avbryter hela operationen.
7. Avslutad session är skrivskyddad. Återupprepat avslut får inte skapa dubbla rörelser.

Saldo och rörelse skrivs alltid i samma transaction. En framtida flytt ska skapa MOVE_OUT och
MOVE_IN atomärt. Aktiva referenser får inte tas bort; verksamhetsobjekt inaktiveras.
MongoDB måste köras som replica set, exempelvis Atlas. Fristående mongod räcker inte för transaktioner.
Index skapas genom ett explicit installationskommando före trafik; inga syncIndexes som raderar index.

## QR och CSV i kommande steg

QR innehåller /location/{slumpmässig-token}. Token identifierar platsen men ger ingen behörighet.
Inloggning och tenant-kontroll krävs även vid skanning; token kan roteras vid behov.
Mobil kamera kräver HTTPS eller localhost. Manuell kodinmatning ska finnas som reserv.
CSV parsas med en riktig parser, begränsad filstorlek/radmängd och radvis Zod-validering.
Validera både dubbletter i filen och befintliga SKU. Visa sammanfattning innan skrivning.

## Etapper och kontrollpunkter

1. Foundation: auth, organisation, tenant, Zod, fel, index; testa två organisationers isolering.
2. Lager och platser: CRUD, koder, QR-etiketter; testa referenser över tenant-gränsen.
3. Produkter: CRUD, sökning, CSV; testa compound uniqueness och importfel.
4. Placering: saldo och historik i transaction; testa rollback och samtidiga justeringar.
5. Inventering: omfattning, räkning, avvikelse, avslut; testa versioner och dubbla avslut.
6. Scanner: kamera, mobilflöde, reservinmatning; testa på fysisk telefon.
7. Dashboard: faktiska aggregat och progress från färdig kärna.

## Före publik lansering

Fas 1 är en lokal utvecklingsgrund. E-postverifiering, lösenordsåterställning och inbjudningar
behöver en vald e-postleverantör och byggs före publik lansering. Registrering kan inte användas
för att ansluta till befintligt företag. IP-baserat skydd vid ingress bör komplettera databasens
konto/global-begränsningar; lita aldrig på godtyckliga forwarded headers.

## Visuell riktning

Användarens bildreferens styr färgtemat: nästan svart bakgrund, violetta gradienter,
ljus text och cyan som accent. Gemensamma färgtokens finns i src/app/globals.css.
Bygg mobil först, med formulärfält och primärknappar på minst 52 px samt tydlig fokusmarkering.
Landningssidan staplas på mobil och får två kolumner på stor skärm; informationskort går
från en till tre kolumner. Respektera prefers-reduced-motion. Exempelvyer med fiktiva
lagertal måste märkas som exempel och får inte förväxlas med användarens verkliga data.

## Levererat i fas 2

Företagsval och nytt företag leder nu till /dashboard. Översikten visar endast faktiska antal
aktiva lager och platser samt nästa steg. Detta är en första översikt, inte fas 7:s rapportering
av inventering och avvikelser. Gemensam navigation binder ihop översikt, lager, platser och inställningar.

Warehouse och Location har nu modeller, services, Zod-validering, API och mobilanpassade sidor.
Admin kan skapa/redigera/inaktivera; warehouse-rollen har läsåtkomst till aktiva objekt.
Sektion motsvarar det befintliga databas- och API-fältet shelf. Ingen datamigrering krävs.
Platskoder genereras från zon, sektion och position (A-01-01). Samma kod kan förekomma i olika
lager men inte två gånger i samma lager inom ett företag. Batchskapande är begränsat till
100 platser per anrop och sker atomärt: en dubblett gör rollback av hela gruppen.

Skapande/redigering av platser tar ett skrivlås på föräldralagret genom locationRevision
i samma transaction. Inaktivering av lager tar samma lås och avvisas om aktiva platser finns.
Det förhindrar att en samtidig platsändring lämnar aktiva platser under ett inaktivt lager.
Lagerplatsens warehouseId kan inte ändras genom redigerings-API:t.

QR-koder är slumpmässiga 24-byte-tokens. QR-länken är stabil vid ändring av platskod.
Utskriftsvyn visar enbart aktiva platser i aktiva lager och har separata utskriftsstilar.
QR-länkar behålls genom inloggning och företagsval. Endast validerade /location/{token}
accepteras som returadress. Länken ger aldrig åtkomst utan medlemskap i rätt organisation.

Kör npm run db:indexes efter uppdateringen för de nya compound- och QR-indexen.
Nästa etapp: Product och CSV-import. Vid fas 4 måste inaktivering av platser även kontrollera
InventoryLevel och öppna inventeringar; alla platser är ännu utan produktplaceringar i fas 2.

## Levererat i fas 3

Produkter har en egen flik med sökning på namn, artikelnummer (SKU) och streckkod,
statusfilter och sidindelning. Administratörer kan skapa, redigera, inaktivera och
återaktivera produkter. Lagermedarbetare ser endast aktiva produkter.

Product har organizationId, normaliserat SKU (trim + versaler), namn, streckkod,
beskrivning, produktfoto eller valfri HTTPS-bildlänk och aktivstatus. Produktfoton
stöds via kamera eller bildval enligt avsnittet Produktfoton nedan.
Indexet (organizationId,sku) är unikt även för inaktiva produkter.
Alla läsningar och mutationer avgränsas av verifierad företagskontext.

CSV-import använder csv-parse och stöder UTF-8/BOM, komma eller semikolon, citerade
fält och radbrytningar. Gränserna är 500 kB och 500 produkter. Kolumner: sku och name
krävs; barcode, description och imageUrl är valfria. Okända och upprepade rubriker
avvisas. Varje produkt Zod-valideras och dubbletter kontrolleras i både fil och databas.

Förhandsgranskningen skriver ingenting och visar radnummer och fel. Vid bekräftelse
valideras filen igen, aktuell företagskontext måste matcha förhandsgranskningen och
hela importen sparas i en transaction. Unikt index skyddar mot samtidiga importer;
vid konflikt rullas hela importen tillbaka. Importen skapar enbart nya produkter.
Vanliga JSON-anrop behåller 16 KiB-gränsen; importanrop tillåter 3 100 000 byte för
JSON-escapning, medan själva CSV-innehållet fortfarande begränsas till 500 000 byte.

Integrationstester täcker företagsisolering, roller, SKU-index, sökning, status,
sidindelning, CSV-format och gränser, fel/dubbletter, företagsbyte och samtidiga importer.
Kör npm run db:indexes för produktindexen innan funktionen används.
Nästa etapp är fas 4: produktplacering, saldo och historik i transaktioner.
Inaktivering av produkter måste då även kontrollera saldo och öppna inventeringar.

## Produktfoton

Produktformuläret har Ta foto (capture=environment) och Välj bild. Fotot förhandsvisas
och sparas först med produkten; avbruten redigering ändrar inte den lagrade bilden.
Mobilens inbyggda kameraval används där webbläsaren stöder det. Desktop använder filval.
JPEG, PNG och WebP stöds. HEIC behöver konverteras till JPEG innan uppladdning.

Klienten accepterar källbilder upp till 20 MB, skalar till högst 1600 px och komprimerar
före uppladdning. Produkt-POST/PATCH tillåter 2 900 000 byte JSON, med ett valfritt photo-fält:
utelämnat behåller bilden, null tar bort den, en bild-data-URL ersätter den.
Servern begränsar inkommande bilddata till 2 MB och 50 megapixlar, verifierar formatet
med Sharp, korrigerar orientering och kodar om till WebP utan EXIF/GPS-metadata.
Lagrade bilder är högst 1200 px och 1 MB.

Product.hasPhoto markerar en separat ProductPhoto-post. Bilddata ligger aldrig i
produktlistans dokument eller svar. En bild per produkt lagras i productPhotos med
unikt (organizationId,productId). Produktändring och bildbyte/borttagning sker i samma
MongoDB-transaction. Konflikter lämnar den tidigare bilden intakt.
Detta ger beständig lagring i befintlig MongoDB utan lokala serverfiler eller ny tjänst.

GET /api/products/[id]/photo kräver session och aktuellt företagsmedlemskap.
Lagermedarbetare ser endast bilder till aktiva produkter. Svaren är image/webp,
private/no-store och nosniff. Bilder visas direkt på produktsidan och som miniatyrer
i listan. Äldre imageUrl-värden och CSV-bildlänkar behålls tills en bild ersätts eller tas bort.
Kör npm run db:indexes för productPhotos-indexet.

## Levererat i fas 4

InventoryLevel lagrar saldo och version per (organizationId,productId,locationId).
warehouseId härleds alltid från den verifierade lagerplatsen. En produkt kan finnas
på flera platser och en plats kan innehålla flera produkter. Nollsaldo behåller
placeringen och dess version; historiska poster raderas inte.

Administratörer kan lägga till en placering och ange ett nytt totalt antal med orsak.
Lagermedarbetare kan läsa saldo. Produktvyn visar placeringar och totalsaldo; platsvyn,
även via QR-länk, visar produkter och antal. Saldoformuläret öppnas som en bottom sheet.
Totalsaldon summeras med BigInt och skickas som decimalsträng för att undvika avrundning.

Mutationer kräver expectedVersion (null för en ny placering). Servern läser aktuellt
saldo i en transaction och avvisar en gammal version med STOCK_CONFLICT/409.
Gränssnittet kräver omläsning och ny bekräftelse efter konflikt; det skriver aldrig
automatiskt över med ett tidigare inmatat antal. Oförändrat antal skapar ingen ny rörelse.

Saldoändring och InventoryMovement skapas i samma transaction. Historiken innehåller
INITIAL eller ADJUSTMENT, tidigare/nytt antal, differens, orsak, utförare och tidpunkt.
Namn, SKU, platskod, lagernamn och utförarens namn sparas vid ändringstillfället så att
senare namnändringar inte skriver om historiken. Historik är läsbar för administratörer,
har sidindelning och saknar API för ändring eller radering.

Saldoändringar låser Warehouse via locationRevision, Location och Product via
stockRevision. Produkt- och platsinaktivering använder samma dokumentlås och avvisas
när ett positivt saldo finns. Därmed kan samtidig placering och inaktivering inte lämna
saldo på inaktiva referenser. Fotoändringar och produktinaktivering förblir atomära.
Kontroller mot öppna inventeringar tillkommer tillsammans med inventeringsmodellerna i fas 5.

API:

- GET /api/inventory?productId=... eller locationId=... (saldo och placeringar)
- GET /api/inventory/level?productId=...&locationId=... (antal och aktuell version)
- POST /api/inventory (productId, locationId, quantity, expectedVersion, reason)
- GET /api/inventory/history?productId=... eller locationId=... samt page (admin)

Integrationstester verifierar isolering, roller, unikt index, flera placeringar,
versionskonflikter, rollback vid misslyckad historikskrivning, samtidig inaktivering,
exakta totalsummor och historikens sidindelning.
Kör npm run db:indexes för inventoryLevels och inventoryMovements innan användning.
Nästa etapp: fas 5, inventeringssessioner, räkning, avvikelser och avslut.

## Genomförd fas 5

Inventering finns på /inventories med egen flik i företagsmenyn.
Admin skapar och startar i samma steg, väljer ett aktivt lager och 1–200 aktiva platser.
Ingen separat utkaststatus används i denna leverans. Omfattningen fryses vid start;
platser som skapas senare läggs inte automatiskt till. Flera inventeringar kan pågå samtidigt.

InventorySession använder active/completed och en revision för granskningen.
InventorySessionLocation sparar pending/counted, platskod, räknare, tid och en revision
som skyddar mot att två användare skriver över samma platsräkning.
InventoryCount är en snapshot med produktnamn, SKU, förväntat antal/version, faktiskt antal,
avvikelse och räknare/tid. Omräkning ersätter snapshoten atomärt efter uttrycklig bekräftelse.

Admin och lagerarbetare kan räkna varje vald plats i en mobilanpassad bottom sheet.
Alla aktiva produktplaceringar måste ingå, även nollsaldo. Saknade produkter kan läggas till
via sökning bland företagets aktiva produkter. Tomma platser kräver en egen bekräftelse.
Räkningsanropet tillåter högst 500 produkter per plats och 100 000 byte JSON.
Räkning ändrar aldrig InventoryLevel. Aktuella versioner kontrolleras vid sparande.

Endast admin avslutar efter granskning. Avslutets transaction kontrollerar granskningens
revision, att samtliga platser är räknade, aktuella saldoversioner och nytillkomna placeringar.
Alla avvikelser justerar saldo och skapar INVENTORY-rörelser med inventorySessionId,
historiska namn och administratörens identitet. Matchande antal kräver ingen saldorörelse.
Ett fel återställer hela avslutet. Upprepat avslut är idempotent, även efter senare inaktivering.
Avslutade inventeringar är skrivskyddade och visar de ursprungliga räkningarna.

Start, räkning och avslut använder samma lagerlås som saldoändringar. Produkt- och platslås
samordnar med inaktivering. Platser och produkter som refereras av en öppen inventering
kan inte inaktiveras, även vid nollsaldo. Alla API-anrop använder verifierad tenant-kontext;
mutationer har Origin-kontroll, Zod, kroppsstorleksgräns och rate limiting.
Index installeras genom db:indexes; inga befintliga index tas bort.
InventoryMovement har ett partiellt unikt index för inventering + produkt + plats.

Verifiering: integrationstester täcker omfattning, tomma platser, tenant/roller, versioner,
bekräftad omräkning, samtidiga ändringar, dubbla avslut, rollback och inaktiveringskonflikter.
Webbläsartest mot isolerad databas täcker skapande, räkning, konflikt/omläsning, tom plats,
granskning, avslut, hittad produkt och skrivskydd; vyer kontrollerade vid 320, 390 och 1440 px.

Nästa etapp: fas 6, inbyggd kamerascanner och manuell reservinmatning samt test på fysisk telefon.

## QR-flöde för inventering
Räkningsrutan visar först en uppmaning att skanna platsens QR-kod. Material, antalsfält,
produktsökning och sparaknapp renderas först efter att rätt platskod har verifierats.
Flödet är: öppna inventering → välj plats → skanna platsens QR-kod → räkna → ange antal → bekräfta.
Ingen skanningsknapp ligger på inventeringens första sida. Kameran öppnas inne i samma ruta.
Tillbaka från kameran visar skanningssteget om platsen ännu inte verifierats.
Verifieringen återställs när rutan stängs eller en annan plats öppnas; omläsning efter
saldokonflikt behåller verifieringen för samma öppna plats. Manuell platskod är reservvägen.
Servern verifierar att koden tillhör den valda platsen, inventeringens frysta omfattning,
rätt lager och aktuell organisation. En kod för en annan plats avvisas.
Inmatade antal behålls när användaren går till kameran och tillbaka; uppdaterade saldon och
räkningsrevisioner läses vid kontrollen och kräver ny bekräftelse före sparande.

Kameran använder getUserMedia och jsQR (https://github.com/cozmo/jsQR), laddat vid behov.
Videobilder bearbetas lokalt. Kameran stoppas efter avläsning, när rutan stängs,
vid återgång till räkningen och när sidan hamnar i bakgrunden.
Kamerafel och nekad behörighet visar manuell platskod som reserv. HTTPS eller localhost krävs.

Befintliga /location/{token}-etiketter fungerar även från telefonens vanliga kamera.
Med en pågående inventering öppnas platsens räkningsruta direkt. QR-token följer med länken
 och verifieras på servern mot aktiv plats, företag och inventering innan materialet visas. Vid flera pågående
inventeringar väljer användaren rätt inventering; utan pågående inventering visas platsuppgifterna.
Inloggning och företagsval bevarar QR-returlänken. Token ger ingen extra behörighet.

Verifierat med integrationstester och webbläsartest inklusive faktisk QR-avkodning från en
simulerad videoström, fel plats, nekad kamera, manuell kod, bibehållna antal och kamerastopp.
Fas 6 har därmed kameraflöde och reservinmatning implementerade, men test med fysisk telefon
och utskriven etikett återstår innan fasens kontrollpunkt är helt klar.

## PDF-rapport för avslutad inventering
Avslutade inventeringar har knappen Ladda ner PDF, bredvid Visa resultat.
GET /api/inventory/sessions/[id]/report kräver verifierad session och medlemskap i rätt företag.
Både admin och lagerarbetare har samma läsrätt till rapporten som till inventeringsresultatet.
Pågående inventering ger 409; främmande inventering ger 404 och anonymt anrop 401.
PDF-svaret skickas som attachment med säkert filnamn, private/no-store och nosniff.
Generering begränsas till tio anrop per användare och minut.

Rapporten genereras på servern med PDFKit och lokalt medföljande Roboto-typsnitt.
Layouten är ljus A4 med StorageViewrs logotyp, lila detaljer, sidnummer och rapport-ID.
Den innehåller företag, lager, start/avslut, ansvariga, antal platser/produkter/rader,
avvikelser, exakta totalsummor, separata över-/underskott och samtliga räkningar per plats.
Även rader utan avvikelse och bekräftat tomma platser ingår. Långa namn radbryts och
tabellrubriker upprepas vid sidbrytningar. Alla tider visas i Europe/Stockholm.

Rapportunderlaget läses från completed InventorySession, InventorySessionLocation och
InventoryCount, aldrig dagens InventoryLevel eller produktnamn.
Nya sessioner sparar startedByName vid start samt organizationName och completedByName
vid avslut. Äldre sessioner går också att exportera: osparade ansvarignamn anges som
Ej sparat; om företagsnamnets historik saknas används dagens namn med tydlig upplysning.
Inga historiska namn har gissats eller skrivits tillbaka till äldre inventeringar.

Verifiering: integrationstester för slutförd status, tenant-isolering, historiska snapshots,
oförändrade rader, tomma platser, stora heltal, äldre sessioner och flersidiga dokument.
PDF-text, alla produktrader, sidnumrering och sidgränser har kontrollerats i renderade PDF-filer.
Webbläsartest verifierar faktisk nedladdning, filnamn, PDF-headers, mobilvy och felhantering.
