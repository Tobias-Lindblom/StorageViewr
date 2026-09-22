# StorageViewr

Lager- och inventeringssystem för mindre företag. Next.js App Router, TypeScript,
MongoDB, Mongoose, Tailwind CSS och Zod.

## Status: grund och lagerstruktur
Implementerat:
- Registrering, inloggning, sessioner, företag och medlemskap (admin/warehouse).
- Företagsöversikt med faktiska antal aktiva lager och lagerplatser.
- Gemensam navigation och separata företagsinställningar.
- Skapa, visa, redigera och inaktivera lager och lagerplatser.
- Skapa upp till 100 platser i följd, atomärt med automatiska platskoder.
- Sökbara lagerplatser, stabila QR-länkar och utskrivbara etiketter.
- Tenant-isolering, rollkontroller, Zod-validering, API-fel och rate limiting.

Nästa steg är produkter och CSV-import, därefter placering och inventering.
Full modell och ordning: [Arkitektur](docs/architecture.md).
Ursprungliga krav: [Kravspecifikation](docs/requirements.md).

## Kör lokalt
1. Använd Node.js 22.13 eller senare, gärna aktuell LTS.
2. Kör `npm install`.
3. Skapa `.env.local` från `.env.example` om du saknar en lokal fil.
4. Ange `APP_URL`, `MONGODB_URI` och `MONGODB_DB`.
5. Använd MongoDB Atlas eller lokal replica set; transaktioner krävs.
6. Kör `npm run db:indexes` före första start och efter uppdateringar av modeller.
   Kommandot skapar collections/index men tar aldrig bort befintliga index.
7. Kör `npm run dev` och öppna http://localhost:3000.
8. Registrera konto, skapa/välj företag och öppna översikten.

APP_URL ska vara webbläsarens exakta origin (schema, värd och port).
I produktion används HTTPS. Hemligheter ligger i .env.local och ignoreras av Git.

## Prova det nya flödet
1. Välj företag → Översikt.
2. Skapa lager med namn och unik kod.
3. Välj Skapa lagerplatser: zon A, sektion 01, första position 1, antal 10.
4. Öppna en plats och följ QR-länken.
5. Välj QR-etiketter och skriv ut eller spara som PDF.
6. Redigera platskod; länken är densamma, men etiketten behöver skrivas ut igen.

För att skanna från en fysisk telefon måste APP_URL vara nåbar från telefonen.
localhost på telefonen pekar på telefonen, inte din dator. Använd den konfigurerade
adressen även i webbläsaren eftersom API:t verifierar Origin.
Inbyggt kamerascannerläge och produktinventering tillkommer i senare etapper.

## Verifiera
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm start` efter build

Integrationstester kör mot temporära replica sets, aldrig din vanliga databas.
Första körningen kan ladda ner MongoDB-testbinären. Testerna täcker autentisering,
sessioner, tenant-isolering, roller, index, rollback, input och origin, rate limiting,
QR-avgränsning, batchskapande och samtidiga lager-/platsändringar.

## API
Svar: `{ data: ... }` eller `{ error: { code, message, details? } }`.
Mutationer kräver korrekt Origin. JSON-anrop kräver Content-Type: application/json.
Request bodies begränsas till 16 KiB.

- POST /api/auth/register, /api/auth/login, /api/auth/logout
- GET/POST /api/organizations
- POST /api/organizations/select
- GET/PATCH /api/organization
- GET/POST /api/warehouses
- GET/PATCH /api/warehouses/[id]
- GET/POST /api/locations (valfritt warehouseId-filter på GET)
- GET/PATCH /api/locations/[id]
- POST /api/locations/batch
- GET /api/health

Organisation och roll hämtas från verifierad session och aktuellt medlemskap.
Alla verksamhetsfrågor, även referenser och QR-sökning, filtreras på organisation.
Historiska objekt raderas inte. Ett lager med aktiva platser kan inte inaktiveras.

## Före publik lansering
MVP:n är inte färdig. E-postverifiering, lösenordsåterställning och inbjudningar återstår.
Konto- och globala databasgränser bör kompletteras med IP-begränsning vid betrodd ingress.

## Referenser
- [Next.js](https://nextjs.org/docs/app/getting-started/installation)
- [Mongoose-transaktioner](https://mongoosejs.com/docs/transactions.html)
- [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [QR-generering](https://github.com/soldair/node-qrcode)
