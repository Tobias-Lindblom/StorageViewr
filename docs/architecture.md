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
Organization är tenant-roten: dess _id är tenant-id; den behöver inget redundant organizationId.
Sessions och rateLimits är säkerhetsdata, inte lagerdata.

Alla affärsfrågor kräver tenant-kontext från verifierad session. Även referenser måste verifieras:
en location och warehouse, eller product och inventoryLevel, måste tillhöra samma organisation.
Populate/aggregation får aldrig kringgå denna kontroll. Tenant-scoping är explicit i services,
inte ett dolt Mongoose-plugin. Admin kontrolleras på servern före mutationer.

## Collections och index
| Collection | Viktiga fält | Index |
| --- | --- | --- |
| organizations | name, slug, timestamps | slug unikt |
| users | email, name, passwordHash, timestamps | normaliserad email unikt |
| memberships | organizationId, userId, role | (organizationId,userId) unikt; userId |
| sessions | tokenHash, userId, organizationId?, expiresAt | tokenHash unikt; expiresAt TTL |
| rateLimits | key, count, expiresAt | key unikt; expiresAt TTL |
| warehouses | organizationId, name, code, address?, active | (organizationId,code) unikt |
| locations | organizationId, warehouseId, code, zone, shelf, position, qrToken, active | (organizationId,warehouseId,code) unikt; qrToken unikt |
| products | organizationId, sku, name, barcode?, description?, imageUrl?, active | (organizationId,sku) unikt |
| inventoryLevels | organizationId, warehouseId, productId, locationId, quantity, version | (organizationId,productId,locationId) unikt; (organizationId,locationId); (organizationId,warehouseId) |
| inventoryMovements | organizationId, productId, locationId, type, previousQuantity, newQuantity, difference, performedBy, inventorySessionId?, reason?, createdAt | (organizationId,productId,createdAt); (organizationId,locationId,createdAt) |
| inventorySessions | organizationId, warehouseId, name, status, startedBy, startedAt?, completedAt? | (organizationId,warehouseId,status) |
| inventorySessionLocations | organizationId, inventorySessionId, locationId, status, completedBy?, completedAt? | (organizationId,inventorySessionId,locationId) unikt |
| inventoryCounts | organizationId, inventorySessionId, productId, locationId, expectedQuantity, expectedVersion, countedQuantity, difference, countedBy, countedAt | (organizationId,inventorySessionId,productId,locationId) unikt |

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
