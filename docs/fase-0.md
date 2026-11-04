# Fase 0: wat ik heb uitgezocht en besloten

## Vraagvormen

Uit de screenshot: **"Welke werkwoordsvorm is juist gespeld?"** Daaronder een zin met een open plek en drie grijze antwoordvakken (1, 2, 3). De drie opties lijken op elkaar en verschillen alleen op de plek waar de regel zit (*geoogste / geoogstte / geoogsten*).

Meer vormen heb ik nog niet gezien. De toetsen gebruiken daarom nu alleen deze vorm. Het dataformaat kan later ook andere vormen aan, zoals "welke zin is juist?". Komen er nieuwe screenshots, dan voeg ik die toe.

Nagebouwd uit de screenshot: titel en "Oefentoets" linksboven, "Vraag x van 40" met een groene balk in het midden, en rechts Toegankelijkheid en een kruisje. Die Toegankelijkheid opent bij ons lettergrootte, lettertype en contrast. Het kruisje is "stoppen, alles is bewaard". Een timer is er niet.

## Bronnen

| Controle | Bron | Bereikbaar vanuit de bouwomgeving |
|---|---|---|
| B | Woordenlijst Nederlandse Taal (woordenlijst.org, dezelfde database als het Groene Boekje), via de MolexServe-API | ja, alle vervoegingen per werkwoord |
| C | OpenTaal-woordenlijst 2.20.23 (keurmerk Taalunie tot 2018) | ja |
| regels | taaladvies.net / Taalunie | ja (alleen als naslag voor de uitleg) |

**Afwijking van het plan, bewust:** controle B is geen met de hand ingevoerde vormentabel geworden. Het is een vaste kopie van de officiële Woordenlijst. Een tabel die ik zelf intyp, is niet onafhankelijk van mij als bouwer. De Woordenlijst wel. Mijn eigen invoer zit in de regelmotor (A), en die wordt tegen de Woordenlijst gelegd. Bij de eerste vergelijking vond die controle 136 verschillen. Allemaal fouten in mijn invoer, zoals *probeer* en *kom*. Die zijn opgelost.

**Wat de bronnen opleverden:** de Woordenlijst toont ook waar twee spellingen goed zijn (*gesurfd/gesurft*, *hou/houd*, *gebakken/gebakt*, *vroeg/vraagde*, *werkte/wrocht*). Al die vormen worden niet gebruikt. OpenTaal mist veel onnatuurlijke vormen (*gebeefde*, *gewachte*). Die vallen daardoor vanzelf weg.

## Termen

De uitleg gebruikt 't kofschip (t, k, f, s, ch, p, en x bij *faxen*). Verder: stam, persoonsvorm, onderwerp, hulpwerkwoord, voltooid en onvoltooid deelwoord, sterk, zwak en onregelmatig. Engelse werkwoorden: "kijk naar de laatste klank die je hoort".

## Toetsverdeling

Zoals voorgesteld: 7 tegenwoordige tijd, 7 verleden tijd, 7 voltooid deelwoord, 3 onvoltooid deelwoord, 3 infinitief, 3 gebiedende wijs, 5 Engelse werkwoorden, 5 bijvoeglijk gebruikt voltooid deelwoord. Instinkers: 12 (toets 1 t/m 5), 18 (6 t/m 14) en 24 (vanaf 15). Alles is instelbaar in `data/config.json`.

## Keuzes die ik zelf heb gemaakt (makkelijk te veranderen)

- **Feedback** staat standaard direct na elke vraag, met een instelling "pas aan het eind". De score staat standaard aan en is te verbergen.
- **Gist:** hetzelfde token als bij RWT werkt, want deze site schrijft naar een eigen bestand (`htt-werkwoordspelling-voortgang.json`).
- **Toets 23 en 24** (reserve) komen vrij op donderdag 21 januari 2027.
- **"Klopt dit wel?"** bewaart de melding in de voortgang. Ik zie hem dus in de Gist en op de instellingenpagina.
- **Onvoltooid deelwoord los in de zin** (*Lachend vertelde hij…*): daar wordt de vorm met -e nooit als foute optie gebruikt. Volgens Taaladvies is die vorm niet fout.
