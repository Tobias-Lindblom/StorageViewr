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
| iPhone | Ej genomförd | – | Väntar | – |
| Android | Ej genomförd | – | Väntar | – |

En kontroll är klar först när avvikelser har fått en reproducerbar beskrivning och antingen
åtgärdats eller accepterats med ansvarig person och datum.
