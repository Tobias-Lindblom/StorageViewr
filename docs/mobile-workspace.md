# Mobil arbetsyta

StorageViewr är byggt för att användas vid den fysiska lagerplatsen. Mobilnavigationen ger
direkt åtkomst till produkter, lagerplatser, skanner, inventering och historik.

## Centrala flöden

- En produkt placeras på en eller flera lagerplatser.
- En ny placering börjar med 0 i registrerat saldo.
- Inleverans ökar saldot på den valda produkt- och lagerplatskombinationen.
- En placering kan flyttas till en annan lagerplats. En tom placering flyttas utan antal,
  en delflytt lämnar resterande saldo och en hel flytt tar bort källplaceringen.
- Inventering räknar det faktiska innehållet utan att ändra saldot innan sessionen slutförs.
- Den första fullständiga inventeringen av ett lager sätter startsaldona och etablerar dess
  baseline. Första ökningen från noll visas som startsaldo, inte som en avvikelse.
- En avvikelse granskas och kan godkännas, utredas eller avslutas av en administratör.
- Direkt korrigering av saldo är en administratörsåtgärd och kräver kommentar.
- QR-skanning öppnar rätt lagerplats och kräver alltid inloggning och tenant-kontroll.

Uttag ingår inte i produktmodellen. En flytt är en intern omlokalisering som bevarar
produktens totalsaldo och uppdaterar båda lagerplatserna i samma transaktion.

## Första lagerstart

Innan företagets lager har en baseline ersätts den vanliga dashboarden av en vägledd startvy.
Stegen bygger på faktisk tenant-avgränsad data och leder användaren från lager och platser till
produkter, placeringar och den första inventeringen. Den inventeringen använder samma mobilvy,
QR-verifiering, signering och transaktioner som senare inventeringar. Saldona ändras först när
hela inventeringen slutförs.

I företag med flera aktiva lager behöver varje lager som har aktiva platser inventeras i sin
helhet. Pågående progress visas per lager och startflödet försvinner först när samtliga relevanta
lager har en slutförd baseline. Lagerhälsa visar ingen procentsats före dess.

## Behörigheter

Lagerpersonal kan läsa aktiva produkter och lagerplatser, registrera inleveranser, flytta
placeringar och genomföra inventeringar. Administratörer hanterar struktur, medlemmar,
korrigeringar, avvikelser och rapporter. Alla databasfrågor avgränsas till den aktiva
organisationen.

## Gränssnitt

Arbetsytan använder samma komponenter på produkt- och lagerplatssidorna. Dialoger öppnas som
bottom sheets på små skärmar, formulär återställer fokus när de stängs och saldoskrivningar
skyddas av versionskontroll. Kameraskanning kräver HTTPS eller localhost; manuell kod finns som
reserv.
