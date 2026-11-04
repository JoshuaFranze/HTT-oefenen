// Heel kleine XML-parser, genoeg voor de antwoorden van de Woordenlijst-API.
// Geeft een boom van { tag, kinderen: [], tekst } terug. Geen attributen nodig.

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const ontsnap = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e] ?? m;
});

export function parseXml(xml) {
  const wortel = { tag: '#wortel', kinderen: [], tekst: '' };
  const stapel = [wortel];
  const re = /<\?[^>]*\?>|<!--[\s\S]*?-->|<(\/?)([A-Za-z_][\w.-]*)[^>]*?(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[4] !== undefined) {
      stapel[stapel.length - 1].tekst += ontsnap(m[4]);
      continue;
    }
    if (!m[2]) continue;
    const [, sluit, tag, zelf] = m;
    if (sluit) {
      const top = stapel.pop();
      if (top.tag !== tag) throw new Error(`XML: verwacht </${top.tag}>, kreeg </${tag}>`);
    } else {
      const knoop = { tag, kinderen: [], tekst: '' };
      stapel[stapel.length - 1].kinderen.push(knoop);
      if (!zelf) stapel.push(knoop);
    }
  }
  if (stapel.length !== 1) throw new Error('XML niet goed afgesloten');
  return wortel;
}

export const kind = (k, tag) => k.kinderen.find((c) => c.tag === tag);
export const kinderen = (k, tag) => k.kinderen.filter((c) => c.tag === tag);
export const tekst = (k, tag) => (kind(k, tag)?.tekst ?? '').trim();
