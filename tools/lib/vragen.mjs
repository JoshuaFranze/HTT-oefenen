// Van een zin uit de zinnenbank naar een complete vraag, plus alle automatische controles.

import { readFileSync, readdirSync } from 'node:fs';
import { opentaal } from './bronnen.mjs';
import { kiesAfleiders } from './afleiders.mjs';
import { maakUitleg, categorieVan, isInstinker } from './uitleg.mjs';

const pad = (p) => new URL('../../' + p, import.meta.url);
export const lees = (p) => JSON.parse(readFileSync(pad(p), 'utf8'));

export const GAT = '___';
const HULP = new Set(['heb', 'hebt', 'heeft', 'hebben', 'had', 'hadden', 'ben', 'bent', 'is', 'zijn', 'was', 'waren', 'word', 'wordt', 'worden', 'werd', 'werden']);
const NAMEN = new Set(lees('data/namen.json').namen);

export function laadZinnen() {
  const dir = pad('data/zinnen/');
  const alle = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const d = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    for (const z of d.zinnen) alle.push({ ...z, bestand: f });
  }
  return alle;
}

const woorden = (zin) => zin.replace(GAT, ' ').split(/[\s]+/).map((w) => w.replace(/^[„“"‘'(]+|[.,!?;:”"’')]+$/g, '')).filter(Boolean);

/** Controleert de zin zelf (spelling van de rest, leestekens, labels). */
export function controleerZin(z, vormen) {
  const p = [];
  const ww = vormen[z.ww];
  if (!/^[a-z]+-\d{3,4}$/.test(z.id || '')) p.push('id ontbreekt of heeft een rare vorm');
  if (!ww) { p.push(`werkwoord ${z.ww} staat niet (meer) in vormen.json`); return p; }
  if (!ww.vormen[z.slot]) p.push(`vorm ${z.slot} van ${z.ww} is niet goedgekeurd (zie niet-gebruiken.json)`);
  const t = z.zin;
  if (t.split(GAT).length !== 2) p.push('de zin moet precies één open plek (___) hebben');
  if (!/^(___|[A-ZÀ-Ý‘'])/.test(t)) p.push('de zin begint niet met een hoofdletter');
  if (!/[.?!]$/.test(t)) p.push('de zin eindigt niet met een punt, vraagteken of uitroepteken');
  if (/\s{2,}/.test(t)) p.push('dubbele spatie');
  if (/\s[.,!?;:]/.test(t)) p.push('spatie voor een leesteken');
  if (/[.,!?;:][A-Za-z]/.test(t.replace(/'t\b/g, ''))) p.push('geen spatie na een leesteken');
  if (z.sleutel && !t.includes(z.sleutel)) p.push(`sleutelwoord ‘${z.sleutel}’ staat niet in de zin`);
  if (z.tijd && !t.includes(z.tijd)) p.push(`tijdwoord ‘${z.tijd}’ staat niet in de zin`);
  const ot = opentaal();
  for (const w of woorden(t)) {
    if (ot.has(w) || ot.has(w.toLowerCase()) || NAMEN.has(w)) continue;
    p.push(`woord ‘${w}’ staat niet in OpenTaal (spelling controleren of naam toevoegen aan data/namen.json)`);
  }
  // het werkwoord mag niet elders in de zin al voorkomen (dat verklapt het antwoord)
  const vormenVanWw = new Set(ww.alleVormen);
  for (const w of woorden(t)) if (vormenVanWw.has(w.toLowerCase())) p.push(`de zin bevat al een vorm van ${z.ww}: ${w}`);

  const [voor, na] = t.split(GAT);
  const woordVoor = woorden(voor).at(-1)?.toLowerCase();
  const woordNa = woorden(na)[0]?.toLowerCase();
  const s = z.slot;
  const nodig = (b, msg) => b || p.push(msg);
  if (s === 'tt.jij.na') nodig(['jij', 'je'].includes(woordNa) && ['jij', 'je'].includes(z.sleutel), 'bij tt.jij.na moet jij of je direct na de open plek staan (en sleutel zijn)');
  if (s === 'tt.jij.voor') nodig(['jij', 'je'].includes(woordVoor) && ['jij', 'je', 'Jij', 'Je'].includes(z.sleutel), 'bij tt.jij.voor moet jij of je direct voor de open plek staan');
  if (s === 'tt.u') nodig(z.inversie ? woordNa === 'u' : woordVoor === 'u', z.inversie ? 'inversie: u moet direct na de open plek staan' : 'u moet direct voor de open plek staan');
  if (s === 'tt.ik') nodig(woordVoor === 'ik' || woordNa === 'ik', 'bij tt.ik moet ik direct voor of na de open plek staan');
  if (z.jeBezit) nodig(s === 'tt.hij' && woordNa === 'je', 'jeBezit: alleen bij tt.hij met je direct na de open plek');
  if (s === 'vd') {
    nodig(HULP.has((z.sleutel || '').toLowerCase()), 'bij vd moet het sleutelwoord een hulpwerkwoord zijn');
    nodig(/^[.?!]$/.test(na.trim()), 'bij vd staat de open plek achteraan (alleen nog een leesteken erna)');
  }
  if (s.startsWith('bvd') || s === 'od.e') nodig(z.sleutel && na.includes(z.sleutel), 'het zelfstandig naamwoord (sleutel) moet na de open plek staan');
  if ((s === 'bvd.kaal' || (s === 'od.kaal' && z.eenHet)) && !z.eenHet) p.push('bvd.kaal kan alleen bij een + het-woord (zet eenHet: true)');
  if (z.eenHet) nodig(/\been\b/i.test(voor), 'eenHet: er moet een ‘een’ voor de open plek staan');
  if (s === 'gw') nodig(voor.trim() === '', 'bij de gebiedende wijs staat de open plek vooraan');
  if (s === 'inf') nodig(z.sleutel && voor.includes(z.sleutel) && /^[.?!]$/.test(na.trim()), 'bij de infinitief staat het sleutelwoord (wil, moet, gaat, te) voor de open plek en staat de open plek achteraan');
  if (s.startsWith('vt.') || s.startsWith('tt.')) nodig(!!z.sleutel, 'het onderwerp (sleutel) ontbreekt');
  return p;
}

const hoofd = (w) => w[0].toUpperCase() + w.slice(1);

/** Maakt de vraag. Geeft { vraag, problemen }. */
export function maakVraag(z, vormen, regels) {
  const problemen = controleerZin(z, vormen);
  const ww = vormen[z.ww];
  if (!ww || !ww.vormen[z.slot]) return { vraag: null, problemen };
  const antwoord = ww.vormen[z.slot];
  const { afleiders, problemen: pa } = kiesAfleiders(z.ww, ww, z);
  problemen.push(...pa);
  if (afleiders.length < 2) return { vraag: null, problemen };
  let u;
  try {
    u = maakUitleg(z.ww, ww, z, afleiders, regels);
  } catch (e) {
    problemen.push(e.message);
    return { vraag: null, problemen };
  }
  const vooraan = z.zin.startsWith(GAT);
  const toon = (w) => (vooraan ? hoofd(w) : w);
  const vraag = {
    id: z.id,
    ww: z.ww,
    categorie: categorieVan(ww, z.slot),
    slot: z.slot,
    regel: u.regel,
    instinker: isInstinker(u.regel, afleiders),
    zin: z.zin,
    antwoord: toon(antwoord),
    afleiders: afleiders.map((a) => ({ vorm: toon(a.vorm), soort: a.soort, patroon: a.patroon })),
    uitleg: {
      kort: u.kort,
      stappen: u.stappen,
      perAfleider: Object.fromEntries(afleiders.map((a) => [toon(a.vorm), vooraan ? hoofd(u.perAfleider[a.vorm]) : u.perAfleider[a.vorm]])),
      onthoud: u.onthoud,
    },
    hints: u.hints,
  };
  problemen.push(...controleerUitleg(vraag, ww.stam, z.ww));
  return { vraag, problemen };
}

const heelWoord = (tekst, w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(tekst);

/** Controleert de uitleg en de hints van een vraag. */
export function controleerUitleg(v, stam, inf) {
  const p = [];
  // De stam mag genoemd worden als stam (ik werk, werk + t, de stam werk); dat is geen goedkeuring van een afleider.
  // Ook het hele werkwoord mag als naam van het werkwoord genoemd worden (winnen is een sterk werkwoord).
  const zonderStam = (t) => {
    if (stam) t = t.replace(new RegExp(`(ik|stam( is)?|stam:) ${stam}\\b|\\b${stam} \\+`, 'giu'), '…');
    if (inf) t = t.replace(new RegExp(`(^|[^\\p{L}])${inf} (is|heeft|begint)\\b|hele werkwoord \\(${inf}\\)|werkwoord: ${inf}\\b`, 'giu'), '$1…');
    return t;
  };
  const opties = [v.antwoord, ...v.afleiders.map((a) => a.vorm)];
  if (new Set(opties.map((o) => o.toLowerCase())).size !== 3) p.push('twee opties zijn hetzelfde');
  if (!heelWoord(v.uitleg.kort, v.antwoord)) p.push('de korte uitleg noemt het goede antwoord niet');
  for (const a of v.afleiders) {
    if (heelWoord(zonderStam(v.uitleg.kort), a.vorm)) p.push(`de korte uitleg noemt afleider ${a.vorm}`);
    for (const s of v.uitleg.stappen) if (heelWoord(zonderStam(s), a.vorm)) p.push(`een stap noemt afleider ${a.vorm}`);
    const t = v.uitleg.perAfleider[a.vorm];
    if (!t || !t.toLowerCase().startsWith(a.vorm.toLowerCase())) p.push(`uitleg bij ${a.vorm} ontbreekt of begint niet met de afleider`);
    if (t && /\b(fout|verkeerd)\b/i.test(t)) p.push(`toon: ‘fout/verkeerd’ in uitleg bij ${a.vorm}`);
  }
  if (v.uitleg.stappen.length > 3) p.push('meer dan 3 stappen');
  for (const h of v.hints) for (const o of opties) if (heelWoord(h, o)) p.push(`hint verklapt een optie (${o})`);
  for (const t of [v.uitleg.kort, ...v.uitleg.stappen, v.uitleg.onthoud]) if (/\b(fout|verkeerd)\b/i.test(t)) p.push('toon: ‘fout/verkeerd’ in de uitleg');
  return p;
}
