# Werkwoordspelling oefenen (HTT, 4F)

Gratis oefensite voor het onderdeel werkwoordspelling van de Hogeschool Taaltoets. Elke week komen er twee oefentoetsen van 40 vragen vrij (vanaf maandag 9 november 2026 tot en met de week van 18 januari 2027). Bij elke vraag is er uitleg, een stappenplan en hulp bij de regel. Alles draait in de browser, de voortgang wordt na elk antwoord bewaard en via een GitHub Gist gesynchroniseerd.

Alle zinnen zijn zelf gemaakt. Er zijn geen echte HTT-vragen overgenomen.

## Hoe de vragen foutloos blijven

Elke vorm die in een vraag voorkomt, gaat door drie onafhankelijke controles. Alleen als ze het alle drie eens zijn, wordt hij gebruikt:

- **A, regelmotor** (`tools/lib/regelmotor.mjs`): rekent de vorm uit met de schoolregels ('t kofschip, ge-, -end, stam + t). Sterke werkwoorden krijgen hun stamtijden uit `data/lexicon.json`.
- **B, Woordenlijst Nederlandse Taal** (Groene Boekje): het volledige paradigma per werkwoord, opgehaald met `tools/haal-woordenlijst.mjs` en vastgelegd in `bronnen/woordenlijst.json`. Geeft de Woordenlijst voor een vorm meer dan één spelling (zoals *gesurfd/gesurft* of *hou/houd*), dan wordt die vorm niet gebruikt.
- **C, OpenTaal-woordenlijst** 2.20.23 (`bronnen/`, licentie in `bronnen/OPENTAAL-LICENSE.txt`). Komt een vorm daar niet in voor, dan valt hij af.

Wat afvalt, staat met de reden in `data/niet-gebruiken.json`.

Daarna komen de controles per vraag (`tools/lib/vragen.mjs`). Ze kijken of er precies één open plek is en of de rest van de zin goed gespeld is (tegen OpenTaal). Ze kijken of geen enkele afleider op die plek ook goed is, en of de uitleg het goede antwoord noemt. Ze kijken ook of een hint nooit een optie verklapt, en of de toon klopt.

Tot slot gaat elke batch langs aparte reviewers (blind oplossen, fouten zoeken en een regelcontrole), in minstens drie rondes. Wat gemarkeerd wordt, wordt aangepast of geschrapt. Daarna gaat alles opnieuw door alle rondes. Een toets komt pas live als hij in `data/review/status.json` is goedgekeurd met precies dezelfde hash. Dat controleert `tools/verifieer.mjs`, en die draait vóór elke deploy.

## Mappen

```
index.html, css/, js/        de site (vanilla JS, voorgebouwde Tailwind)
data/lexicon.json            werkwoordenlijst (invoer regelmotor)
data/vormen.json             goedgekeurde vormen (gegenereerd: A = B = C)
data/zinnen/*.json           handgemaakte zinnen per onderdeel
data/regels.json             stappenplan en regelkaarten met voorbeelden
data/toetsen/toets-NN.json   vastgezette toetsen (40 vragen + 16 reserves)
data/trainer.json            vragen voor de valkuilen-trainer
data/blocklist.json          uitgeschakelde vragen (reserve valt automatisch in)
data/config.json             vrijgavedata, verdeling, instinkers, hints
data/review/status.json      reviewstatus per toets (met hash)
tools/                       regelmotor, bronnen, bouwen, controleren, reviewbladen
tests/                       unit-tests en end-to-end-test (Playwright)
review/                      reviewbladen en reviewuitkomsten per ronde
```

## Werken met de repo

```bash
node tools/vormen.mjs                    # A, B en C vergelijken en vormen.json maken
node tools/check-zinnen.mjs              # alle zinnen controleren (--alles toont elke vraag)
node tools/bouw-toetsen.mjs --toetsen 5-10   # nieuwe batch bouwen (bestaande toetsen blijven vast)
node tools/reviewblad.mjs 5-10           # reviewbladen maken
node tools/verifieer.mjs                 # alle controles, zoals in CI
npm test && npm run test:e2e             # tests
npm run build:css && npm start           # lokaal bekijken op http://localhost:8765
```

Voor testen kun je `?datum=2026-12-01` achter het adres zetten. De site doet dan alsof het die dag is. Aan de opgeslagen voortgang verandert niets.

## Een vraag uitzetten

Krijg je via "Klopt dit wel?" een melding (die staat in de voortgang en dus ook in de Gist)? Zet het id van de vraag dan in `data/blocklist.json`:

```json
{ "vragen": [{ "id": "tt-012", "reden": "melding 12 november" }] }
```

De app laat dan automatisch een reservevraag uit hetzelfde onderdeel zien. Antwoorden worden per vraag-id bewaard, dus de voortgang blijft heel.

## Live zetten

Eenmalig: in de repo bij Settings, Pages, Source kiezen voor **GitHub Actions**. Daarna wordt elke push naar `main` eerst gecontroleerd en pas bij groen gedeployed.
