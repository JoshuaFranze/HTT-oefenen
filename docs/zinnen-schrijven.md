# Zinnen schrijven voor de zinnenbank

Elke zin wordt automatisch een vraag (opties, uitleg, hints). Jij schrijft alleen de zin met labels.
Na het schrijven: `node tools/check-zinnen.mjs <id-voorvoegsel>` moet 0 problemen geven.

## Formaat (één object per regel, in data/zinnen/<bestand>.json)

```json
{"id":"tt-1001","ww":"vinden","slot":"tt.hij","zin":"Mijn zus ___ die film prachtig.","sleutel":"Mijn zus"}
```

- `ww`: hele werkwoord uit data/vormen.json. Kijk met `node tools/werkwoorden-voor.mjs <slot>` (Engels: `--leen`).
- `slot`: tt.ik, tt.jij.voor, tt.jij.na, tt.u, tt.hij, tt.mv, vt.ev, vt.mv, vd, od.e, od.kaal, inf, gw, bvd.e, bvd.kaal.
- `sleutel`: het woord(groep) waar het om draait. tt/vt: het onderwerp zoals het in de zin staat. vd: het hulpwerkwoord (heeft, is, wordt, ...). inf: het werkwoord ervoor (wil, moet, gaat) of `te`. od.e/bvd: het zelfstandig naamwoord erna. gw en losse od.kaal: geen sleutel.
- Extra labels: `"tijd":"Gisteren"` (verplicht bij vt: een woord dat het verleden echt vastlegt: gisteren, vorige week, vroeger, afgelopen zaterdag; níet: zaterdag, vannacht, op haar verjaardag). `"inversie":true` bij tt.u met u achter het werkwoord. `"jeBezit":true` bij tt.hij met je = jouw (Wordt je broer ...). `"eenHet":true` bij od.kaal/bvd.kaal met een + het-woord in het enkelvoud.

## Regels voor de zin

1. Precies één `___`. Hoofdletter aan het begin (of `___` vooraan), punt/vraagteken/uitroepteken aan het eind. Geen cijfers, geen afkortingen. Gewone apostrof (baby's).
2. Natuurlijk, kort, alledaags Nederlands (stage, studie, familie, koken, fietsen, sport, huis). Niets over toetsen, stress, ziekte of ellende. Nooit een echte HTT-zin.
3. Precies één goed antwoord. Daarom:
   - Onderwerp nooit `Ze` of `Zij` (enkelvoud of meervoud?). Gebruik `mijn zus`, `de buren`, `hij`, `we`.
   - vt: altijd een `tijd`-woord dat het verleden vastlegt.
   - tt.jij.na: `jij`/`je` direct ná de open plek en dat is het onderwerp. tt.jij.voor: `jij`/`je` direct vóór de open plek.
   - vd en inf: de open plek staat helemaal achteraan (alleen nog een leesteken).
   - gw: de open plek vooraan, een opdracht zonder onderwerp. Niet met `jij` of `u`. Geen vinden (anglicisme).
   - od.kaal zonder eenHet: het deelwoord staat los ("___ liep hij weg", "Ze kwam ___ binnen").
   - bvd/od.e: het zelfstandig naamwoord (sleutel) staat ná de open plek; een lidwoord (de/het/een) staat direct vóór de open plek of alleen met `pas`, `net`, `vers`, `goed`, `mooi` ertussen.
   - Scheidbare werkwoorden alleen in vd, inf, bvd, od. Gebruik geen werkwoord dat in de zin eigenlijk scheidbaar is (bel ... op, zoek ... uit) bij tt/vt/gw.
4. Geen ander vervoegd woord van hetzelfde werkwoord in de zin (de checker meldt dat).
5. Elke zin is nieuw: geen kopie van een bestaande zin (de checker meldt dubbele zinnen).
6. Verdeel de werkwoorden: gebruik er veel verschillende, niet steeds dezelfde. Gebruik oogsten nooit.
7. gw werkt alleen goed met een stam op d (meld, antwoord, kleed) of een werkwoord op -ven/-zen (geef, reis, schrijf). Bij andere werkwoorden geeft de checker "te weinig goede afleiders".
8. Schrijf je bestand in één keer weg (niet regel voor regel), zodat de checker van anderen niet over een half bestand struikelt. Crasht de checker op een bestand van iemand anders, wacht dan even en draai hem opnieuw.

## Instinkers

De checker zet INSTINKER achter een zin met een bekende valkuil. Typische instinkers:
tt: stam op d (vindt, wordt), stam op t (zet), jij/je achter het werkwoord, u achter het werkwoord, je = jouw, prefixwerkwoorden waarbij tt en vd hetzelfde klinken (verhuist/verhuisd, gebeurt/gebeurd).
vt: -ven/-zen (leefde, reisde), stam op t/d (praatte, landde), sterk werkwoord bij jij, meervoud met tijdwoord en stam op t/d (antwoordden).
vd: be/ge/her/er/ont/ver, stam op t/d (gezet, geland), -ven/-zen, scheidbaar, gemengd/onregelmatig.
od: een + het-woord (een slapend kind). inf: stam op t/d (antwoorden/antwoordden, praten/praatten). gw: stam op d (Meld, Antwoord).
eng: klank (updatete, racete, crashte, geliket, getimed), stam op t/d (downloadde, gedownload, hij downloadt).
bvd: vd op t (verwachte), een + het-woord (een gekookt ei), spellingaanpassing (gezette, geredde), vt-gelijk (verbrande/verbrandde).
