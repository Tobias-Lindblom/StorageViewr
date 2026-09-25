# StorageViewr – arkitektur och datamodell

## Avgränsning och första leverans

Målet är flödet organisation → lager → platser → produkter → placering → QR → inventering → avvikelser.
Vi bygger vertikalt och verifierar varje steg. Fas 1 omfattar registrering, inloggning, organisation,
medlemskap, säker tenant-kontext och organisationsinställningar. Inga påhittade dashboardtal.

## Struktur

- src/app: sidor och tunna Route Handlers.
- src/features/auth: registrering, inloggning och formulär.
- src/features/organizations: organisationslogik och inställningar.
- src/features/{warehouses,locations,products,inventory,scanner}: domänlogik för respektive arbetsflöde.
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
| inventoryMovements        | organizationId, productId, locationId, type, previousQuantity, newQuantity, difference, performedBy, inventorySessionId?, transferId?, reason?, createdAt | (organizationId,productId,createdAt); (organizationId,locationId,createdAt); (organizationId,transferId) |
| inventorySessions         | organizationId, warehouseId, warehouseName, organizationName?, name, status, revision, startedBy/Name, startedAt, completedBy/Name?, completedAt? | (organizationId,warehouseId,status)                                                                  |
| inventorySessionLocations | organizationId, inventorySessionId, locationId, locationCode, status, revision, completedBy/Name?, completedAt?                                  | (organizationId,inventorySessionId,locationId) unikt                                                 |
| inventoryCounts           | organizationId, inventorySessionId, productId, productName, sku, locationId, expectedQuantity/version, countedQuantity, difference, countedBy/Name, countedAt | (organizationId,inventorySessionId,productId,locationId) unikt                              |

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

Saldo och rörelse skrivs alltid i samma transaction. En flytt skapar TRANSFER_OUT och
TRANSFER_IN atomärt med ett gemensamt transferId. Aktiva referenser får inte tas bort;
verksamhetsobjekt inaktiveras.
MongoDB måste köras som replica set, exempelvis Atlas. Fristående mongod räcker inte för transaktioner.
Index skapas genom ett explicit installationskommando före trafik; inga syncIndexes som raderar index.

## QR och CSV

QR innehåller /location/{slumpmässig-token}. Token identifierar platsen men ger ingen behörighet.
Inloggning och tenant-kontroll krävs även vid skanning; token kan roteras vid behov.
Mobil kamera kräver HTTPS eller localhost. Manuell kodinmatning finns som reserv.
CSV parsas med csv-parse, begränsad filstorlek/radmängd och radvis Zod-validering.
Dubbletter i filen och befintliga SKU valideras och en sammanfattning visas innan skrivning.

## Etapper och kontrollpunkter

1. Foundation: klar. Auth, organisation, tenant, Zod, fel, index och isolering mellan företag.
2. Lager och platser: klar. CRUD, koder, QR-etiketter och referenskontroll över tenant-gränsen.
3. Produkter: klar. CRUD, sökning, foto, CSV, compound uniqueness och importfel.
4. Placering: klar. Saldo och historik i transaction, rollback och samtidiga justeringar.
5. Inventering: klar. Omfattning, räkning, avvikelse, avslut, versioner och idempotens.
6. Scanner: funktionellt implementerad. Kamera, mobilflöde och reservinmatning är verifierade
   i webbläsartest; kontroll på fysisk telefon med utskriven QR-etikett återstår.
7. Dashboard: klar. Faktiska tenant-avgränsade aggregat och inventeringsprogress från den
   färdiga kärnan visas på översikten.
8. Lagerhändelser: klar. Inleverans, uttag, atomisk flytt och administratörskorrigering
   registreras med orsak, versionskontroll och full historik.

Etapp 1–8 är funktionellt implementerade. Fas 6 har ingen kvarvarande programmeringspunkt,
men dess fysiska kontrollpunkt måste genomföras före publik lansering.

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

Företagsval och nytt företag leder till /dashboard. Fas 2 etablerade applikationsskalet och
gemensam navigation för företagets arbetsvyer. Dashboardens aktuella innehåll beskrivs under fas 7.

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
Inaktivering av platser kontrollerar nu både InventoryLevel och öppna inventeringar enligt
de skydd som infördes i fas 4 och 5.

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
Inaktivering av produkter kontrollerar nu saldo och öppna inventeringar enligt fas 4 och 5.

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

Det ursprungliga administrativa API:t kan lägga till en placering och ange ett nytt totalt antal
med orsak. Det operativa lagerhändelseflödet beskrivs i fas 8. Produktvyn visar placeringar och totalsaldo; platsvyn,
även via QR-länk, visar produkter och antal. Saldoformuläret öppnas som en bottom sheet.
Lagerplatslistan markerar en aktiv plats som Upptagen när minst en produkt har positivt saldo;
placeringar med nollsaldo räknas som Tomma eftersom inget fysiskt antal finns på platsen.
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
Kontroller mot öppna inventeringar ingår och använder samma lås som inventeringsflödet.

API:

- GET /api/inventory?productId=... eller locationId=... (saldo och placeringar)
- GET /api/inventory/level?productId=...&locationId=... (antal och aktuell version)
- POST /api/inventory (productId, locationId, quantity, expectedVersion, reason)
- POST /api/inventory/movements (inleverans, uttag, flytt eller korrigering)
- GET /api/inventory/history?productId=... eller locationId=... samt page (admin)

Integrationstester verifierar isolering, roller, unikt index, flera placeringar,
versionskonflikter, rollback vid misslyckad historikskrivning, samtidig inaktivering,
exakta totalsummor och historikens sidindelning.
Kör npm run db:indexes för inventoryLevels och inventoryMovements innan användning.

## Genomförd fas 5

Inventering finns på /inventories med egen flik i företagsmenyn.
Förstasidan visar endast pågående inventeringar. Knappen Genomförda bredvid Starta inventering
öppnar /inventories/completed med genomförda inventeringar, senast genomförda först.
Status filtreras i databasfrågan före sidindelning; antal räknade platser hämtas separat.
Båda listorna är tenant-avgränsade och tillgängliga för admin och lagerarbetare.
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

## Implementerad fas 6 – QR-flöde för inventering
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
och verifieras på servern mot aktiv plats, företag och inventering innan materialet visas.
Vid flera pågående inventeringar väljer användaren rätt inventering; utan pågående inventering
visas platsuppgifterna.
Inloggning och företagsval bevarar QR-returlänken. Token ger ingen extra behörighet.

Verifierat med integrationstester och webbläsartest inklusive faktisk QR-avkodning från en
simulerad videoström, fel plats, nekad kamera, manuell kod, bibehållna antal och kamerastopp.
Fas 6 har därmed kameraflöde och reservinmatning implementerade, men test med fysisk telefon
och utskriven etikett återstår innan fasens kontrollpunkt är helt klar.

## PDF-rapport för avslutad inventering
Avslutade inventeringar har knappen Ladda ner PDF under listan med lagerplatser.
Någon separat Visa resultat-knapp eller resultatpanel finns inte; sparade räkningar visas genom
att respektive lagerplats öppnas och hela inventeringen kan hämtas som PDF.
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

## Genomförd fas 7 – Dashboard

Översikten visar fyra faktiska, tenant-avgränsade nyckeltal: aktiva lager, aktiva lagerplatser,
aktiva produkter och pågående inventeringar. Varje ruta länkar till motsvarande arbetsvy.
Rutorna visas två och två på mobil och i fyra kolumner när utrymmet räcker.

Dashboardfrågan räknar endast aktiva lager, platser och produkter samt InventorySession med
status active i det valda företaget. Avslutade och andra företags inventeringar påverkar inte talet.
Detta verifieras med integrationstest för tomt läge, aktiv/inaktiv data, status och tenant-isolering.

När det finns pågående inventeringar visar översikten de tre senast startade. Varje rad innehåller
inventeringens namn, lager, räknade platser i förhållande till den frysta omfattningen, progressbar
och en direktlänk till inventeringen. Visa alla leder till den fullständiga inventeringslistan.
Progressen räknas på servern från tenant-avgränsade InventorySessionLocation-poster; inga
exempelvärden eller klientberäknade ersättningsvärden används.

## Genomförd fas 8 – Lagerhändelser

Produkt- och lagerplatsvyerna använder Registrera lagerhändelse i stället för en generell
Ändra antal-funktion. Admin och lagerarbetare kan registrera inleverans och uttag med antal
och obligatorisk anledning. Servern räknar fram det nya saldot och avvisar uttag som överstiger
det aktuella saldot. Endast administratörer kan korrigera ett saldo till ett angivet faktiskt
antal; korrigeringen kräver också en anledning och visas som en egen händelsetyp i historiken.

Flytt väljer en annan aktiv lagerplats inom samma företag. Käll- och destinationssaldo läses
med separata versionsnummer och uppdateras i samma MongoDB-transaction. Historiken får en
TRANSFER_OUT- och en TRANSFER_IN-rad med samma transferId. Ett fel eller en versionskonflikt
rullar tillbaka båda saldona och båda historikraderna, så totalsaldot för produkten bevaras.

Gränssnittet visar nuvarande saldo, rätt antalsetikett för vald händelse och, vid flytt,
destinationsplatsens saldo. Vid samtidig ändring måste aktuella saldon läsas in innan ett nytt
försök kan göras. Historiken visar de nya händelsetyperna med svenska namn.

Integrationstester verifierar roller, inleverans, uttag, administratörskorrigering,
otillräckligt saldo, tenant-isolering, versionskonflikt, länkade flyttrader och full rollback.
Kör npm run db:indexes för transferId-indexet innan funktionen används i en befintlig miljö.
