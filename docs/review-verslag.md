# Reviewverslag

**Toets 1 t/m 4 en de trainer (303 vragen):** vijf rondes met aparte reviewers. Elke ronde had drie rollen: blind oplossen, fouten zoeken en een regelcontrole. In alle blinde rondes koos de reviewer bij elke vraag het antwoord dat ook de sleutel is. De fouten die gevonden werden, zaten bijna allemaal in de gedeelde regelteksten en sjablonen. Die zijn verbeterd en daarna opnieuw gereviewd.

**Toets 5 t/m 24 (1.120 vragen):** de zinnen zijn nieuw geschreven door aparte schrijvers. Daarna zijn ze in vier delen beoordeeld, met per deel een blinde reviewer en een inhoudelijke controle. 119 gemarkeerde vragen zijn geschrapt (zie `data/geschrapt.json`) en vervangen. De vervangers kregen opnieuw een blinde en een inhoudelijke controle, tot er geen fout- of twijfelpunten meer over waren.

Wat de reviews structureel hebben opgeleverd:

- **Een nieuwe automatische controle op het geslacht van zelfstandige naamwoorden** (`tools/haal-zelfstandig.mjs`, uit de Woordenlijst). Daarmee kan *een kloppende hart* niet meer door de controle komen.
- **Betere lettergreepsplitsing:** *be-gre-pen*, *aan-ge-kle-de*.
- **Een betere uitleg** bij een stam op t of d, bij Engelse werkwoorden (klank) en bij het lidwoord.

Waar een reviewer twijfelde aan een Engelse vorm die de Woordenlijst bevestigt (*deletete*, *geliket*), wint de bron. Zo staat het in het plan.

De goedkeuring per toets staat met hash in `data/review/status.json`. De uitkomsten per ronde staan in `review/`.
