# Drift och felsökning

## API-loggar

Alla definierade API-routes går genom den gemensamma request-wrappern i
`src/lib/server/api.ts`. Varje anrop får ett nytt servergenererat request-ID.
ID:t returneras i svarets `x-request-id`-header och även i JSON-felet när ett
anrop misslyckas.

En avslutad request skrivs som en JSON-rad:

```json
{
  "timestamp": "2026-11-05T12:00:00.000Z",
  "level": "warn",
  "event": "api.request.completed",
  "requestId": "18aa5429-245b-4df0-a38d-090b6b41f9c1",
  "method": "POST",
  "route": "/api/inventory/sessions/:id/complete",
  "status": 409,
  "durationMs": 34.2,
  "userId": "...",
  "organizationId": "...",
  "errorCode": "STALE_VERSION",
  "errorName": "AppError"
}
```

Loggnivån bestäms av statuskoden:

- `info`: lyckade svar
- `warn`: 4xx-svar
- `error`: 5xx-svar

Vid oväntade 500-fel loggas upp till fem stack frames. Felmeddelandets första
rad tas bort för att databasadresser eller andra värden från ett underliggande
fel inte ska följa med.

## Dataskydd i loggar

Loggern tar bara emot ett fast antal tekniska fält. Följande ska aldrig läggas
till i en loggrad:

- request- eller response-body
- cookies, sessionstoken eller authorization-headers
- lösenord eller återställningstoken
- inbjudningstoken
- e-postadress eller telefonnummer
- signaturbild eller produktbild
- query-parametrar

Dynamiska databas-ID:n och inbjudningstoken ersätts med platshållare i
route-fältet. `userId` och `organizationId` är interna ID:n som används för att
avgränsa felsökning. De ska omfattas av samma åtkomst- och lagringspolicy som
övriga produktionsloggar.

## Felsökning med request-ID

1. Läs request-ID från JSON-felets `error.requestId` eller nätverkssvarets
   `x-request-id`.
2. Sök efter exakt samma ID i serverloggarna.
3. Kontrollera route, status, errorCode och durationMs.
4. Använd userId och organizationId för att avgränsa berörd data utan att
   efterfråga lösenord, token eller formulärinnehåll från användaren.

Extern uptime-kontroll, liveness/readiness och backupkontroll införs i senare
driftleveranser.

## Central felrapportering

Applikationen använder Sentry för oväntade server-, route-, React- och
webbläsarfel. Integrationen är avstängd när DSN saknas. Följande variabler ska
sättas i staging och produktion:

```text
SENTRY_DSN=https://...@...ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@...ingest.sentry.io/...
SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_ORG=organisationens-slug
SENTRY_PROJECT=projektets-slug
SENTRY_AUTH_TOKEN=hemlig-byggtoken
SENTRY_RELEASE=git-commit-eller-release-id
```

`SENTRY_AUTH_TOKEN` används endast när source maps laddas upp under bygget och
får aldrig ges prefixet `NEXT_PUBLIC_`. Om auth-token saknas fungerar
felrapporteringen fortfarande, men stack traces från minifierad klientkod blir
svårare att läsa.

Klienttrafiken skickas via `/monitoring` utan cookies eller andra credentials.
Det gör att nuvarande `connect-src 'self'` kan behållas. Tracing och session
replay är avstängda; leveransen samlar bara in fel.

Sentry-filtreringen tar bort request-body, response-body, headers, cookies,
query-parametrar, fria extra-fält och Sentrys user-objekt. E-postadresser,
anslutningssträngar och tokenliknande värden maskeras i felmeddelanden.
Interna user- och organization-ID:n läggs endast till för oväntade API-fel så
att en incident kan avgränsas till rätt tenant.

Rekommenderade första larm i Sentry:

- nytt fel i produktionsmiljön
- samma fel minst fem gånger på fem minuter
- oväntade fel i inventeringsslutförande eller rapportgenerering
- fler än tio unika berörda användare för samma fel under en timme

Larmen skapas i Sentry efter att projekt, DSN och mottagare har konfigurerats.
