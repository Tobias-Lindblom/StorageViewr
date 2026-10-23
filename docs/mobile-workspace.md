# Mobil arbetsyta

StorageViewr är byggt för att användas vid den fysiska lagerplatsen. Mobilnavigationen ger
direkt åtkomst till produkter, lagerplatser, skanner, inventering och historik.

## Centrala flöden

- En produkt placeras på en eller flera lagerplatser.
- En ny placering börjar med 0 i registrerat saldo.
- Inleverans ökar saldot på den valda produkt- och lagerplatskombinationen.
- Inventering räknar det faktiska innehållet utan att ändra saldot innan sessionen slutförs.
- En avvikelse granskas och kan godkännas, utredas eller avslutas av en administratör.
- Direkt korrigering av saldo är en administratörsåtgärd och kräver kommentar.
- QR-skanning öppnar rätt lagerplats och kräver alltid inloggning och tenant-kontroll.

Uttag och flyttar ingår inte i produktmodellen. Materialets aktuella fysiska placering och
registrerade saldo fastställs genom placering, inleverans, inventering och avvikelsehantering.

## Behörigheter

Lagerpersonal kan läsa aktiva produkter och lagerplatser, registrera inleveranser och genomföra
inventeringar. Administratörer hanterar struktur, medlemmar, korrigeringar, avvikelser och
rapporter. Alla databasfrågor avgränsas till den aktiva organisationen.

## Gränssnitt

Arbetsytan använder samma komponenter på produkt- och lagerplatssidorna. Dialoger öppnas som
bottom sheets på små skärmar, formulär återställer fokus när de stängs och saldoskrivningar
skyddas av versionskontroll. Kameraskanning kräver HTTPS eller localhost; manuell kod finns som
reserv.