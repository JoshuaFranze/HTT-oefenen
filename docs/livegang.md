# Live zetten: wat ik nog zelf moet doen

1. ~~**GitHub Pages aanzetten (eenmalig).**~~ Gedaan. Ga naar https://github.com/JoshuaFranze/HTT-oefenen/settings/pages en kies bij *Build and deployment → Source* voor **GitHub Actions**.
2. **De deploy opnieuw starten.** Ga naar https://github.com/JoshuaFranze/HTT-oefenen/actions, open de laatste run van *Controleren en live zetten* en klik op *Re-run all jobs*. Na een paar minuten staat de site op https://joshuafranze.github.io/HTT-oefenen/
3. **Standaardbranch (optioneel).** Bij https://github.com/JoshuaFranze/HTT-oefenen/settings kan ik de standaardbranch op `main` zetten. Daarna kan de branch `claude/htt-werkwoordspelling-plan-26qn2m` weg.
4. **Token voor de sync.** Is de RWT-site op een telefoon al gekoppeld? Dan neemt deze site dat token vanzelf over, want beide staan op joshuafranze.github.io. Zo niet, dan plak ik het RWT-token (of een nieuw token met alleen de scope "gist", via https://github.com/settings/tokens/new?scopes=gist&description=HTT%20werkwoordspelling) op de site bij Instellingen → Voortgang bewaren.
5. **Proef.** Ik open de site op haar telefoon, maak een paar vragen, sluit de browser en kijk of ze daarna nog verder kan waar ze was. Vóór 9 november kan ik `?datum=2026-11-09` achter het adres zetten om toets 1 alvast te zien.
6. **Agenda.** Op het dashboard staat *Herinneringen in je agenda*. Dat zet haar twee herinneringen per week in haar agenda.

Elke volgende push naar `main` wordt eerst helemaal gecontroleerd. Pas als alles groen is, gaat hij live.
