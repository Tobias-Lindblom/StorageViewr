# Fysisk mobilverifiering

Webbläsartesterna kör StorageViewr i Chromium med desktop- och Pixel 7-profiler. En fysisk
kontroll behövs dessutom eftersom kamera, skärmtangentbord, safe areas och rotation styrs av
operativsystemet.

## Förberedelser

1. Kör en produktionslik build över HTTPS på en adress som telefonen når.
2. Sätt `APP_URL` till exakt samma origin och använd en separat testorganisation.
3. Skriv ut minst två riktiga QR-etiketter och skapa en liten inventering för platserna.
4. Använd inga verkliga person- eller lagervärden i testorganisationen.

## Enheter

Kontrollera minst en aktuell iPhone/Safari och en aktuell Android/Chrome. Notera modell,
operativsystem, webbläsarversion, skärmorientering och datum i testprotokollet.

## Kontrollpunkter

- Logga in, välj företag och navigera med den fasta mobilnavigationen.
- Öppna en QR-länk från telefonens vanliga kamera; returvägen ska överleva inloggning.
- Öppna en inventeringsplats; kameran ska starta direkt efter beviljad behörighet.
- Skanna rätt och fel etikett, neka kamerabehörighet och använd den manuella reservvägen.
- Räkna, lägg till en hittad produkt, spara och kontrollera konflikt/omläsning.
- Signera i liggande helskärmsläge, rotera tillbaka och slutför inventeringen.
- Ladda ner inventeringsrapporten och kontrollera tabell, lagervärde, namn och signatur.
- Kontrollera 200 % textzoom, skärmtangentbord, fokus, safe area och att inga primärknappar döljs.
- Kontrollera långsam anslutning och återhämtning efter att nätverket tillfälligt bryts.

## Protokoll

| Enhet | OS/webbläsare | Datum | Resultat | Avvikelser |
| --- | --- | --- | --- | --- |
| iPhone, modell ej noterad | iOS, installerad PWA och mobil webbläsare; versioner ej noterade | 2026-10-30 | Delvis godkänd | Baseline-inventeringen slutfördes. Signering efter rotation fungerade inte i PWA:n och genomfördes därför i webbläsaren. Efter återgång från en annan app kunde en tryckning registreras ovanför eller nedanför den synliga träffytan. Båda PWA-fixarna väntar på ett nytt fysiskt test. |
| Android | Ej genomförd | – | Väntar | – |

### Första baseline-inventeringen på iPhone

Inventeringen genomfördes från start till färdigt resultat på en iPhone. Det ordinarie
mobilflödet fungerade fram till signeringen. När telefonen skulle vridas för signering i
liggande helskärmsläge fungerade inte flödet i den installerade PWA:n. Inventeringen kunde
slutföras genom att öppna StorageViewr i den mobila webbläsaren och signera där.

| Kontroll | Resultat | Kommentar |
| --- | --- | --- |
| Inloggning och mobil navigation | Godkänd | Baseline-inventeringen kunde öppnas och genomföras på iPhone. |
| Inventeringsflöde på mobil | Godkänd | Den första baseline-inventeringen genomfördes med telefonen. |
| Signering i mobil webbläsare | Godkänd | Webbläsaren användes som reservväg och inventeringen kunde signeras och slutföras. |
| Signering i liggande läge i installerad PWA | Omtest krävs | Rotation till signeringsläget fungerade inte under det fysiska testet. En kodändring har gjorts och verifierats automatiskt, men behöver testas igen på en fysisk iPhone. |
| Återgång till PWA:n efter byte till en annan app | Omtest krävs | En tryckning kunde träffa ett element ovanför eller nedanför det synliga målet. Viewport- och fokusläget återställs nu när appen lämnar och återgår till förgrunden; ändringen är automatiskt verifierad men behöver testas på samma sätt på en fysisk iPhone. |
| Fel etikett, nekad kamerabehörighet och manuell reservväg | Ej verifierad | Ingick inte uttryckligen i baseline-testet. |
| Rapportens innehåll på mobil | Ej verifierad | Ingen separat fysisk kontroll noterades för den nedladdade rapporten. |
| Textzoom, skärmtangentbord, fokus och safe area | Ej verifierad | Kräver en riktad tillgänglighetskontroll på enheten. |
| Långsam anslutning och nätverksavbrott | Ej verifierad | Kräver ett separat test med begränsad eller bruten anslutning. |

Nästa fysiska kontroll på iPhone ska i första hand verifiera att signaturen bevaras när
telefonen roteras, att hela signeringsytan går att använda i PWA:n och att inventeringen kan
signeras och slutföras utan att lämna den installerade appen. Växla därefter flera gånger
mellan PWA:n och Kalkylatorn, både med och utan ett aktivt formulärfält, och kontrollera att
knappar, fält och listposter reagerar exakt där de visas.

En kontroll är klar först när avvikelser har fått en reproducerbar beskrivning och antingen
åtgärdats eller accepterats med ansvarig person och datum.
