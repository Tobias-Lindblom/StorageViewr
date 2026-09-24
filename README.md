# StorageViewr

Lager- och inventeringssystem för mindre företag. Next.js App Router, TypeScript,
MongoDB, Mongoose, Tailwind CSS och Zod.

## Status: etapp 1–5, inklusive inventering
Implementerat:
- Registrering, inloggning, sessioner, företag och medlemskap (admin/warehouse).
- Företagsöversikt med faktiska antal aktiva lager och lagerplatser.
- Gemensam navigation och separata företagsinställningar.
- Skapa, visa, redigera och inaktivera lager och lagerplatser.
- Skapa upp till 100 platser i följd, atomärt med automatiska platskoder.
- Sökbara lagerplatser, stabila QR-länkar och utskrivbara etiketter.
- Tenant-isolering, rollkontroller, Zod-validering, API-fel och rate limiting.

- Produkter med unika artikelnummer, sökning, statusfilter och sidindelning.
- Produktfoto från mobilkamera eller bildval, med förhandsvisning och privat lagring i MongoDB.
- CSV-import med förhandsgranskning, radfel och atomärt sparande.

- Produktplacering, saldo per plats och totalsaldo per produkt.
- Saldohistorik, versionskontroll och skydd mot inaktivering när saldo finns kvar.

Nästa steg är inventeringssessioner och avvikelser.
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
Platsbaserad inventering finns i etapp 5. Inbyggt kamerascannerläge tillkommer i etapp 6.

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
Request bodies begränsas till 16 KiB, utom platsräkning (100 000 byte), produkt-POST/PATCH med foto (2 900 000 byte) och produktimport (3 100 000 byte för JSON). CSV-innehållet begränsas separat till 500 kB och 500 produkter.

- POST /api/auth/register, /api/auth/login, /api/auth/logout
- GET/POST /api/organizations
- POST /api/organizations/select
- GET/PATCH /api/organization
- GET/POST /api/warehouses
- GET/PATCH /api/warehouses/[id]
- GET/POST /api/locations (valfritt warehouseId-filter på GET)
- GET/PATCH /api/locations/[id]
- POST /api/locations/batch
- GET/POST /api/products (q, status och page på GET)
- GET/PATCH /api/products/[id]
- GET /api/products/[id]/photo (kräver företagsbehörighet)
- POST /api/products/import (mode: preview eller commit)
- GET/POST /api/inventory
- GET /api/inventory/level (productId och locationId)
- GET /api/inventory/history (admin; productId eller locationId, page)
- GET/POST /api/inventory/sessions
- GET /api/inventory/sessions/[id]
- PUT /api/inventory/sessions/[id]/count/[locationId]
- POST /api/inventory/sessions/[id]/complete (admin)
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

## Prova lagersaldo
1. Öppna en produkt och välj Lägg på plats.
2. Välj lagerplats, ange totalt antal och en orsak.
3. Öppna lagerplatsen för att se produkterna som finns där.
4. Välj Ändra antal för att registrera ett nytt saldo.
5. Visa saldohistorik för tidigare antal, ändring, orsak och utförare.

Vid en samtidig ändring: välj Läs in aktuellt saldo, kontrollera antalet och spara igen.
Starta om utvecklingsservern efter ändrade Mongoose-modeller så att de nya fälten laddas.

## Prova inventering (etapp 5)
1. Öppna Inventering och välj Starta inventering som administratör.
2. Ange namn, välj lager och markera platserna som ska räknas (högst 200).
3. Öppna en plats, ange faktiskt antal och bekräfta hela platsen. Även tomma platser bekräftas.
4. Hittat en annan produkt? Sök och lägg till den i räkningen. Högst 500 produkter per plats.
5. Räkningarna sparas separat från lagersaldot. Ändrade saldon kräver omläsning och omräkning.
6. När alla platser är räknade väljer admin Granska och avsluta, bekräftar och uppdaterar saldona.
7. Avslutad inventering visar historiska räkningar; saldohistoriken länkar tillbaka till inventeringen.

Kör `npm run db:indexes` efter uppdateringen och starta om utvecklingsservern.
Kommandot lägger till collections och index utan att ta bort befintliga index.
Lagerarbetare kan räkna men kan inte starta eller avsluta inventeringar.
Inbyggd kamerascanning tillkommer i etapp 6.
