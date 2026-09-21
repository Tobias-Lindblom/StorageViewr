# StorageViewr

Jag vill bygga en SaaS-applikation som heter **StorageViewr**.

Teknikstacken ska vara:

* Next.js
* TypeScript
* MongoDB
* Mongoose
* Tailwind CSS

Applikationen ska byggas som ett separat projekt och ska från början struktureras så att den senare kan användas av flera olika företag som kunder.

## Vad StorageViewr är

StorageViewr är ett enkelt lager- och inventeringssystem för mindre företag.

Produkten ska framför allt lösa tre frågor:

1. Vad har vi i lager?
2. Var finns produkterna fysiskt?
3. Stämmer det faktiska antalet med lagersaldot?

StorageViewr ska inte initialt försöka vara ett komplett WMS, ERP-system eller ordersystem.

Fokus ska ligga på den fysiska lagerverksamheten.

Kärnan i systemet är:

**Produkt → fysisk lagerplats → antal → historik**

En produkt ska kunna finnas på flera olika lagerplatser samtidigt.

Exempel:

SKU-104 – Nitrilhandske M

* A-01-01: 12 st
* B-03-02: 48 st
* C-01-04: 20 st

Totalt saldo: 80 st.

Det är alltså viktigt att systemet inte endast känner till totalsaldot för en produkt utan exakt var varje del av lagret finns.

---

# Målgrupp

Första målgruppen är mindre företag med ungefär:

* 20–500 SKU
* 1–10 användare
* ett eller ett fåtal mindre lager
* lagerhantering som idag kanske sker genom Excel, papper, Shopify, enklare affärssystem eller manuella rutiner

Systemet ska vara betydligt enklare att förstå och använda än ett traditionellt WMS.

Mobil användning är mycket viktig.

---

# MVP

Första versionen ska hållas relativt liten.

MVP:n ska innehålla:

* organisation/företag
* användare
* lager
* zoner
* lagerplatser
* produkter
* SKU
* eventuellt EAN/streckkod
* lagersaldo per fysisk lagerplats
* möjlighet för samma produkt att finnas på flera platser
* QR-koder för lagerplatser
* mobil QR-skanning
* inventeringssessioner
* registrering av faktiskt antal
* avvikelse mellan systemsaldo och räknat saldo
* historik över lagerförändringar
* enkel dashboard
* CSV-import av produkter

Vi ska INTE börja med:

* Shopify-integration
* Shipmondo
* inköpsorder
* försäljningsorder
* frakt
* avancerad rapportering
* AI-funktioner
* komplex WMS-logik
* ekonomifunktioner

Arkitekturen får gärna förberedas så att sådana funktioner kan läggas till senare, men de ska inte byggas nu.

---

# Multi-tenancy

StorageViewr ska redan från början byggas som en multi-tenant SaaS.

Varje kund representeras av en Organization.

Exempel:

Organization A ska aldrig kunna läsa eller ändra data som tillhör Organization B.

All verksamhetsdata ska därför vara kopplad till organisationen.

Exempel:

```ts
organizationId: ObjectId
```

Detta ska bland annat finnas på:

* warehouses
* locations
* products
* inventoryLevels
* inventoryMovements
* inventorySessions
* inventoryCounts

Alla API-anrop och databasfrågor ska tenant-skopas.

Undvik exempelvis queries som endast söker efter:

```ts
Product.findById(productId)
```

om produkten är organisationsspecifik.

Använd hellre något i stil med:

```ts
Product.findOne({
  _id: productId,
  organizationId
})
```

Multi-tenancy och säker isolering mellan företag ska betraktas som en grundprincip för hela projektet.

---

# Roller

Första versionen behöver inte ha ett avancerat behörighetssystem.

Börja med två roller:

## Admin

Kan:

* hantera företaget
* skapa lager
* skapa lagerplatser
* lägga till produkter
* importera produkter
* hantera användare
* starta inventering
* se avvikelser
* justera lager
* se historik

## Warehouse

Kan:

* se relevanta lagerplatser
* skanna QR-koder
* inventera
* registrera antal
* se produkter och lagerplatser

Arkitekturen ska göra det möjligt att lägga till fler roller senare.

---

# Datamodell

Använd MongoDB med Mongoose.

Undvik att bygga hela lagret som stora djupt nästlade MongoDB-dokument.

Använd separata collections och ObjectId-referenser.

En möjlig grundstruktur är:

```text
organizations
users
memberships

warehouses
locations

products
inventoryLevels

inventoryMovements

inventorySessions
inventoryCounts
```

---

# Organization

Representerar ett kundföretag.

Exempel:

```ts
{
  _id,
  name,
  slug,
  createdAt,
  updatedAt
}
```

---

# Membership

Kopplar en användare till ett företag.

Exempel:

```ts
{
  _id,
  userId,
  organizationId,
  role: "admin" | "warehouse"
}
```

Detta gör att användarens identitet hålls separerad från rollen inom ett specifikt företag.

---

# Warehouse

Representerar ett fysiskt lager.

Exempel:

```ts
{
  _id,
  organizationId,
  name,
  code,
  address?,
  active,
  createdAt,
  updatedAt
}
```

---

# Location

Representerar en fysisk lagerplats.

Exempel:

```ts
{
  _id,
  organizationId,
  warehouseId,

  code: "B-03-02",

  zone: "B",
  shelf: "03",
  position: "02",

  qrToken,

  active,

  createdAt,
  updatedAt
}
```

`code` ska vara ett läsbart plats-ID för användaren.

`qrToken` ska kunna användas för att identifiera lagerplatsen från en QR-kod utan att exponera intern logik i onödan.

---

# Product

Exempel:

```ts
{
  _id,
  organizationId,

  sku,
  name,

  barcode?,
  description?,
  imageUrl?,

  active,

  createdAt,
  updatedAt
}
```

SKU ska vara unik inom organisationen.

Använd exempelvis ett compound index:

```ts
productSchema.index(
  {
    organizationId: 1,
    sku: 1
  },
  {
    unique: true
  }
)
```

---

# InventoryLevel

Detta är en av de viktigaste modellerna i systemet.

Den representerar hur många exemplar av en produkt som finns på en specifik lagerplats.

Exempel:

```ts
{
  _id,

  organizationId,
  warehouseId,

  productId,
  locationId,

  quantity,

  createdAt,
  updatedAt
}
```

Kombinationen:

```text
organizationId
productId
locationId
```

ska vara unik.

Exempel:

```ts
inventoryLevelSchema.index(
  {
    organizationId: 1,
    productId: 1,
    locationId: 1
  },
  {
    unique: true
  }
)
```

Detta gör att samma produkt kan finnas på många lagerplatser men endast ha ett InventoryLevel per specifik plats.

---

# InventoryMovement

Alla viktiga lagerförändringar ska kunna spåras.

Ändra alltså inte endast:

```text
quantity 48 → 46
```

utan skapa även en historikpost.

Exempel:

```ts
{
  _id,

  organizationId,

  productId,
  locationId,

  type,

  previousQuantity,
  newQuantity,
  difference,

  performedBy,

  inventorySessionId?,

  reason?,

  createdAt
}
```

Exempel på `type`:

```text
INITIAL_STOCK
INVENTORY_ADJUSTMENT
MANUAL_ADJUSTMENT
MOVE_IN
MOVE_OUT
```

Detta ska senare göra det möjligt att visa:

```text
SKU-104
B-03-02

48 → 46

Avvikelse: -2

Utfört av:
Anna

Orsak:
Inventory adjustment
```

Spårbarhet ska vara en viktig princip i StorageViewr.

---

# Databassäkerhet och transactions

När kritiska lageroperationer gör flera databasändringar ska MongoDB-transaktioner användas där det är lämpligt.

Exempel:

När ett lagersaldo justeras ska:

1. InventoryLevel uppdateras
2. InventoryMovement skapas

Detta bör ske i samma transaction så att vi inte riskerar att lagersaldot ändras utan att historiken sparas.

---

# QR-system

QR-koder ska primärt tillhöra lagerplatser, inte produkter.

Exempel:

Lagerplats:

```text
B-03-02
```

har en fysisk etikett med QR-kod.

När användaren skannar QR-koden med sin telefon öppnas rätt lagerplats.

Exempel:

```text
/location/{qrToken}
```

Där visas:

```text
B-03-02

SKU-104
Nitrilhandske M
Systemsaldo: 48

SKU-206
Steril kompress
Systemsaldo: 16
```

Vid inventering ska användaren kunna skriva in faktiskt antal direkt från samma mobilvy.

---

# Inventering

Inventering ska vara kärnflödet i första versionen.

Admin startar en InventorySession.

Exempel:

```text
Septemberinventering 2026
Borås lager
```

Systemet skapar eller hanterar de lagerplatser som ska inventeras.

Lagerarbetaren ska sedan kunna:

```text
Starta inventering
↓
Skanna QR
↓
B-03-02
↓
Se produkter
↓
Räkna
↓
Ange faktiskt antal
↓
Bekräfta
↓
Nästa lagerplats
```

När faktiskt antal skiljer sig från systemantalet ska en avvikelse skapas.

Exempel:

```text
Systemsaldo: 48

Räknat:
46

Avvikelse:
-2
```

Vi ska kunna se alla avvikelser efter inventeringen.

---

# InventorySession

Exempel:

```ts
{
  _id,

  organizationId,
  warehouseId,

  name,

  status:
    "draft" |
    "active" |
    "completed",

  startedBy,

  startedAt?,
  completedAt?,

  createdAt,
  updatedAt
}
```

---

# InventoryCount

Exempel:

```ts
{
  _id,

  organizationId,

  inventorySessionId,

  productId,
  locationId,

  expectedQuantity,
  countedQuantity,
  difference,

  countedBy,
  countedAt
}
```

Det historiska `expectedQuantity` ska sparas så att rapporteringen senare visar vilket systemsaldo som faktiskt fanns när inventeringen utfördes.

---

# CSV-import

Produkter ska kunna importeras från CSV.

Första versionen behöver exempelvis stödja:

```text
sku,name,barcode
```

Exempel:

```text
SKU001,Nitrilhandske M,735000000001
SKU002,Nitrilhandske L,735000000002
SKU003,Steril kompress,
```

Importen ska:

* validera filen
* visa felaktiga rader
* förhindra dubbla SKU inom organisationen
* ge användaren en sammanfattning innan eller efter import

---

# Dashboard

Dashboarden ska vara enkel och användbar.

Exempel på första nyckeltal:

```text
247 produkter

38 lagerplatser

12 avvikelser

92 % inventerat
```

Visa även pågående inventering.

Exempel:

```text
Septemberinventering

38 / 42 platser klara

92 %

12 avvikelser

[Fortsätt inventering]
```

Undvik att bygga en dashboard fylld med grafer bara för att den ska se avancerad ut.

Informationen ska ha praktiskt värde.

---

# UI och UX

StorageViewr ska kännas som ett modernt B2B-system.

Designen ska vara:

* ren
* professionell
* enkel
* snabb
* tydlig
* mobilvänlig

Undvik onödigt stora mängder information på samma sida.

Desktop används främst för administration.

Mobil används främst för:

* skanning
* inventering
* lagerarbete

Scanner Mode ska därför prioriteras för mobil.

Knappar och interaktiva element i mobilvyer ska vara stora och enkla att använda även i en lagermiljö.

---

# Föreslagen route-struktur

Exempel:

```text
/dashboard

/products
/products/[productId]

/warehouses
/warehouses/[warehouseId]

/locations
/locations/[locationId]

/inventory
/inventory/[sessionId]

/scan
/location/[qrToken]

/history

/settings
/settings/organization
/settings/users
```

Route-strukturen får justeras om en bättre lösning finns.

---

# Projektstruktur

Strukturen ska vara tydlig och skalbar.

Undvik gigantiska filer.

Separera exempelvis:

```text
src/

app/
components/
features/
lib/
models/
services/
types/
validation/
```

Jag vill gärna organisera större funktioner feature-baserat.

Exempel:

```text
features/
  products/
  warehouses/
  locations/
  inventory/
  scanner/
```

Gemensamma komponenter kan ligga under:

```text
components/
```

Databasmodeller:

```text
models/
```

Databasanslutning och server utilities:

```text
lib/server/
```

Validering:

```text
validation/
```

---

# API-design

Använd Next.js Route Handlers.

Håll API-logiken tunn.

Route Handlers ska främst:

1. autentisera användaren
2. verifiera organisation
3. validera input
4. kalla service/business logic
5. returnera svar

Undvik att lägga stora mängder affärslogik direkt i `route.ts`.

Exempel:

```text
Route Handler
     ↓
Validation
     ↓
Service
     ↓
Mongoose Model
```

---

# Validering

All input från användare och API ska valideras.

Använd gärna Zod.

TypeScript-typer ska inte betraktas som runtime-validering.

Validera exempelvis:

* ObjectId
* SKU
* quantity
* location code
* CSV-data
* inventory counts

Antal får aldrig kunna bli `NaN` eller ett ogiltigt värde.

---

# Felhantering

Skapa en konsekvent strategi för API-fel.

Exempel:

```json
{
  "error": {
    "code": "LOCATION_NOT_FOUND",
    "message": "Lagerplatsen kunde inte hittas."
  }
}
```

Undvik olika felstrukturer i olika delar av projektet.

---

# Säkerhetsprinciper

StorageViewr ska byggas säkert från början.

Prioritera särskilt:

* tenant isolation
* authorization
* input validation
* säkra ObjectId-kontroller
* rate limiting på relevanta endpoints
* inga klientkontroller som enda säkerhet
* server-side authorization
* inga MongoDB-queries direkt baserade på osanerad input

Användaren får aldrig kunna ändra `organizationId` manuellt för att komma åt ett annat företags data.

Organisationen ska komma från den autentiserade kontexten.

---

# Indexering

Planera MongoDB-index tidigt.

Minst följande relationer kommer användas ofta:

```text
organizationId
organizationId + sku
organizationId + warehouseId
organizationId + locationId
organizationId + productId
organizationId + productId + locationId
inventorySessionId
qrToken
```

Skapa endast relevanta index, men vänta inte tills projektet är stort innan indexering börjar hanteras.

---

# Utvecklingsprincip

Bygg projektet vertikalt istället för att skapa hela systemet på en gång.

Jag vill att första fungerande versionen ska kunna göra följande:

```text
1. Skapa organisation
2. Skapa lager
3. Skapa 10 lagerplatser
4. Lägga in/importera 30 produkter
5. Placera produkter på lagerplatser
6. Generera QR-koder
7. Starta inventering
8. Skanna lagerplats
9. Räkna produkterna
10. Registrera antal
11. Visa avvikelse
12. Avsluta inventeringen
```

När hela detta flöde fungerar har vi den första riktiga MVP:n.

Undvik att bygga funktioner som inte behövs för detta flöde innan kärnan fungerar.

---

# Föreslagen utvecklingsordning

## Fas 1 – Foundation

Skapa:

* projektstruktur
* MongoDB-anslutning
* Mongoose-konventioner
* environment variables
* autentisering
* Organization
* Membership
* tenant context
* grundläggande felhantering
* Zod-validation

Säkerställ att multi-tenancy fungerar innan större funktioner byggs.

---

## Fas 2 – Warehouse structure

Bygg:

* Warehouse
* Location
* skapa/redigera lager
* skapa/redigera lagerplatser
* generering av location codes
* QR-token
* QR-koder

---

## Fas 3 – Products

Bygg:

* Product model
* produktlista
* skapa produkt
* redigera produkt
* sökning
* CSV-import

---

## Fas 4 – Inventory placement

Bygg:

* InventoryLevel
* lägg produkt på lagerplats
* ändra saldo
* visa alla platser en produkt finns på
* visa alla produkter på en lagerplats
* InventoryMovement

---

## Fas 5 – Inventory

Bygg:

* InventorySession
* InventoryCount
* starta inventering
* platsbaserad inventering
* avvikelser
* slutför inventering
* historik

---

## Fas 6 – Mobile scanner

Bygg ett mobil-first scannerläge.

Prioritera:

* kamera
* QR-skanning
* snabb navigation
* stora knappar
* minimal mängd klick
* tydlig feedback när en plats registrerats

Detta är en av de viktigaste delarna av produkten.

---

## Fas 7 – Dashboard

Bygg först när riktig data finns.

Visa exempelvis:

* antal produkter
* antal lagerplatser
* pågående inventering
* antal avvikelser
* senaste lagerförändringar

---

# Viktiga arkitekturregler

Följ dessa regler genom hela projektet:

1. Multi-tenancy från första dagen.
2. Alla företagsägda dokument ska innehålla `organizationId`.
3. Tenant-scoping ska ske server-side.
4. Använd separata MongoDB-collections istället för stora nästlade dokument där datan har egna livscykler.
5. InventoryLevel representerar saldo per produkt och lagerplats.
6. Lagerförändringar ska vara spårbara genom InventoryMovement.
7. Kritiska lagerändringar ska använda transactions där flera dokument måste ändras atomärt.
8. API-lagret ska vara tunt.
9. Business logic ska ligga i services/features.
10. Input ska runtime-valideras.
11. Undvik `any` i TypeScript.
12. Använd tydliga enums/unions för status och typer.
13. Bygg små återanvändbara komponenter.
14. Mobil lageranvändning ska betraktas som first-class use case.
15. Bygg inte framtida funktioner innan MVP-flödet fungerar.

---

# Kodkvalitet

Jag vill hellre ha:

* tydlig
* enkel
* testbar
* underhållbar

kod än överdrivet abstrakt enterprise-kod.

Skapa inte abstraheringar bara för att de potentiellt kan behövas i framtiden.

Men undvik samtidigt quick fixes som gör att projektet måste skrivas om när fler företag eller lager läggs till.

Tänk:

**simple now, scalable later.**

---

# Det första konkreta målet

Den första milstolpen för StorageViewr ska vara:

> Ett mindre företag ska kunna lägga in cirka 30 produkter och 10–20 lagerplatser, skriva ut QR-koder, gå runt i lagret med en mobiltelefon, skanna varje lagerplats, inventera produkterna och efteråt se exakt vilka lagersaldon som avviker.

All implementation ska initialt prioriteras utifrån detta mål.

Börja med att analysera kraven ovan och föreslå en bra projektstruktur och datamodell.

Skapa därefter projektet stegvis.

Försök inte implementera hela systemet i ett enda stort steg.

Efter varje större del, kontrollera att typer, tenant-isolering, databasmodell och flöde fortfarande är konsekventa med projektets arkitektur.
