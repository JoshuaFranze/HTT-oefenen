// Welke toetsen zijn vrij? Op basis van de datum van het apparaat, in de tijdzone Europe/Amsterdam.
// Voor testen: ?datum=2026-12-01 in de adresbalk. Dat verandert alleen wat je ziet, nooit de opgeslagen voortgang.

const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export function vandaag(tijdzone = 'Europe/Amsterdam') {
  const q = new URLSearchParams(location.search).get('datum');
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  return new Intl.DateTimeFormat('en-CA', { timeZone: tijdzone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export const testDatumActief = () => /^\d{4}-\d{2}-\d{2}$/.test(new URLSearchParams(location.search).get('datum') || '');

const alsDatum = (s) => {
  const [j, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(j, m - 1, d, 12));
};

export function mooieDatum(s, { jaar = false } = {}) {
  const d = alsDatum(s);
  return `${DAGEN[d.getUTCDay()]} ${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]}${jaar ? ' ' + d.getUTCFullYear() : ''}`;
}

export function dagenTussen(a, b) {
  return Math.round((alsDatum(b) - alsDatum(a)) / 86400000);
}

/** Lijst van alle toetsen met hun status ten opzichte van vandaag. */
export function rooster(config, gebouwd) {
  const nu = vandaag(config.tijdzone);
  return config.vrijgave.map((v) => ({
    ...v,
    vrij: v.datum <= nu && gebouwd.has(v.toets),
    komtNog: v.datum > nu,
    nietKlaar: v.datum <= nu && !gebouwd.has(v.toets),
  }));
}

/** Agendabestand met een herinnering op elke dag dat er een toets vrijkomt. */
export function maakIcs(config, siteUrl) {
  const perDag = new Map();
  for (const v of config.vrijgave) {
    if (!perDag.has(v.datum)) perDag.set(v.datum, []);
    perDag.get(v.datum).push(v.toets);
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const regels = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HTT oefenen//werkwoordspelling//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const [datum, toetsen] of perDag) {
    const d = datum.replace(/-/g, '');
    const volgende = new Date(alsDatum(datum).getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    const wat = toetsen.length > 1 ? `Oefentoets ${toetsen.join(' en ')} staan klaar` : `Oefentoets ${toetsen[0]} staat klaar`;
    regels.push(
      'BEGIN:VEVENT',
      `UID:htt-toets-${d}@htt-oefenen`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${volgende}`,
      `SUMMARY:Werkwoordspelling: ${wat}`,
      `DESCRIPTION:Rustig oefenen\\, zonder tijdsdruk. ${siteUrl}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${wat}`,
      'TRIGGER:PT17H',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  regels.push('END:VCALENDAR');
  return regels.join('\r\n') + '\r\n';
}
