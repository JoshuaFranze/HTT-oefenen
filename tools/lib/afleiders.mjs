// Afleiders (foute opties) voor een vraag.
// Elke afleider heeft een patroon (wat er precies misgaat) en een soort:
//   'a' = een echte vorm van hetzelfde werkwoord die op deze plek niet past
//   'b' = een veelgemaakte spellingfout (bestaat niet als woord)
// Een afleider wordt geweigerd als hij op deze plek volgens de Woordenlijst goed is,
// als hij als ander woord in OpenTaal staat (dan is het geen duidelijke spellingfout),
// of als hij te veel afwijkt van het goede antwoord.

import { wntVormen, opentaal } from './bronnen.mjs';
import { zwakVd } from './uitleg.mjs';

export function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const ruil = (w) => (w.endsWith('t') ? w.slice(0, -1) + 'd' : w.endsWith('d') ? w.slice(0, -1) + 't' : null);

/**
 * Alle kandidaat-afleiders voor deze vraag, in volgorde van voorkeur.
 * ww = rij uit data/vormen.json, zin = de zin uit de zinnenbank.
 */
export function kandidaten(inf, ww, zin) {
  const V = ww.vormen;
  const c = V[zin.slot];
  const { stam } = ww;
  const L = [];
  const add = (vorm, patroon) => vorm && vorm !== c && !L.some((x) => x.vorm === vorm) && L.push({ vorm, patroon });
  const s = zin.slot;

  if (s === 'tt.hij' || s === 'tt.jij.voor' || s === 'tt.u') {
    if (V.vd && V.vd !== c && levenshtein(V.vd, c) === 1 && /[td]$/.test(V.vd)) add(V.vd, 'tt-vd-gelijk'); // gebeurt / gebeurd
    if (stam.endsWith('d')) add(stam.slice(0, -1) + 't', 'tt-d-als-t'); // vint
    if (stam.endsWith('t')) add(stam + 't', 'tt-dubbele-t'); // zett
    add(stam, 'tt-t-vergeten'); // vind
    if (/s$/.test(stam) && /zen$/.test(inf)) add(stam.slice(0, -1) + 'zt', 'tt-z-gehouden'); // verhuizt
    if (/f$/.test(stam) && /ven$/.test(inf)) add(stam.slice(0, -1) + 'vt', 'tt-v-gehouden'); // leevt
    if (!/[td]$/.test(stam)) add(stam + 'd', 'tt-d-ipv-t'); // werkd
    add(inf, 'tt-mv-ipv-ev'); // laatste keus: het hele werkwoord
  } else if (s === 'tt.jij.na' || s === 'tt.ik') {
    add(V['tt.hij'], s === 'tt.ik' ? 'tt-ik-met-t' : 'tt-inversie-t'); // vindt jij
    if (stam.endsWith('d')) add(stam.slice(0, -1) + 't', 'tt-d-als-t'); // vint
    if (stam.endsWith('d')) add(stam + 't', 'tt-inversie-t');
    if (/s$/.test(stam) && /zen$/.test(inf)) add(stam.slice(0, -1) + 'z', 'tt-z-gehouden');
    if (/f$/.test(stam) && /ven$/.test(inf)) add(stam.slice(0, -1) + 'v', 'tt-v-gehouden');
    if (!/[td]$/.test(stam)) add(stam + 'd', 'tt-d-achter-stam');
    add(inf, 'tt-mv-ipv-ev');
  } else if (s === 'tt.mv') {
    add(V['tt.hij'], 'tt-ev-ipv-mv');
    if (/(aa|ee|oo|uu)[^aeiou]$/.test(stam) && stam + 'en' !== inf) add(stam + 'en', 'mv-dubbele-klinker'); // woonen
    if (V['vt.mv'] && levenshtein(V['vt.mv'], c) === 1 && zin.tijd) add(V['vt.mv'], 'tt-vt-gelijk');
    add(stam, 'tt-stam-ipv-mv');
  } else if (s === 'vt.ev' || s === 'vt.mv') {
    const mv = s === 'vt.mv';
    if (mv && zin.tijd && V['tt.mv'] && levenshtein(V['tt.mv'], c) === 1) add(V['tt.mv'], 'vt-tt-gelijk'); // antwoorden / antwoordden
    const zwak = !ww.soort || ww.soort === 'zwak' || (ww.soort === 'gemengd' && /(te|de)n?$/.test(c));
    if (zwak && /(te|de)n?$/.test(c)) {
      const basis = mv ? c.slice(0, -1) : c; // werkte
      const kern = basis.slice(0, -2); // stam
      const ander = basis.endsWith('te') ? 'de' : 'te';
      add(kern + ander + (mv ? 'n' : ''), 'vt-kofschip-omgedraaid'); // werkde
      if (/[td]$/.test(kern) && basis.slice(-2, -1) === kern.slice(-1)) {
        // praatte -> praate, landde -> lande (bij meervoud is dat de tegenwoordige tijd: zie vt-tt-gelijk)
        const minder = kern.slice(0, -1) + basis.slice(-2) + (mv ? 'n' : '');
        if (minder !== V['tt.mv'] && minder !== inf) add(minder, 'vt-een-t-of-d-te-weinig');
      }
      if (/s$/.test(kern) && /zen$/.test(inf)) add(kern.slice(0, -1) + 'zde' + (mv ? 'n' : ''), 'vt-z-gehouden');
      if (/f$/.test(kern) && /ven$/.test(inf)) add(kern.slice(0, -1) + 'vde' + (mv ? 'n' : ''), 'vt-v-gehouden');
    } else {
      // sterk: liep -> liept (jij), liepen <-> liep
      if (!c.endsWith('t') && !mv) add(c + 't', zin.sleutel && /^(jij|je|u)$/i.test(zin.sleutel) ? 'vt-sterk-jij-t' : 'vt-sterk-t');
    }
    if (!zwak) add(ww.stam + (ww.klank === 't' ? 'te' : 'de') + (mv ? 'n' : ''), 'vt-zwak-gemaakt'); // koopte
    add(mv ? V['vt.ev'] : V['vt.mv'], mv ? 'vt-ev-ipv-mv' : 'vt-mv-ipv-ev');
    // alleen als de zin duidelijk in het verleden speelt: de tegenwoordige tijd als afleider
    if (zin.tijd && !mv && V['tt.hij'] && levenshtein(V['tt.hij'], c) <= 2) add(V['tt.hij'], 'vt-tt');
  } else if (s === 'vd') {
    if (V['tt.hij'] && V['tt.hij'] !== c && levenshtein(V['tt.hij'], c) === 1) add(V['tt.hij'], 'vd-tt-gelijk'); // verhuist
    if (ww.vv && !ww.sch) add('ge' + c, 'vd-ge-teveel'); // geverhuisd
    if (ww.vv && ww.sch) add(ww.sch + 'ge' + c.slice(ww.sch.length), 'vd-ge-teveel'); // voorgebereid
    if (/[td]$/.test(c) && !/(td|dt)$/.test(c)) {
      const r = ruil(c);
      add(r, 'vd-t-d-omgedraaid'); // gewerkd
    }
    if (/[td]$/.test(c)) add(c + (c.endsWith('d') ? 't' : 'd'), 'vd-dt'); // gebeurdt
    if (V['bvd.e'] && V['bvd.e'] !== c) add(V['bvd.e'], 'vd-met-e'); // gewerkte
    if (/en$/.test(c) && ww.soort !== 'zwak') {
      add(zwakVd(ww), 'vd-zwak-gemaakt'); // gelacht, geloopt
      const m = c.match(/^(.*[^aeiou])([aeo])([^aeiou])en$/); // gelopen -> geloopen
      if (m) add(m[1] + m[2] + m[2] + m[3] + 'en', 'vd-sterk-spelling');
    }
  } else if (s === 'inf') {
    if (/(aa|ee|oo|uu)[^aeiou]$/.test(stam || '') && stam + 'en' !== c) add(stam + 'en', 'mv-dubbele-klinker'); // praaten
    if (V['vt.mv'] && V['vt.mv'] !== c && levenshtein(V['vt.mv'], c) <= 2 && /(tt|dd)en$/.test(V['vt.mv'])) add(V['vt.mv'], 'inf-vt-gelijk'); // antwoordden, praatten
    if (V['tt.hij'] && levenshtein(V['tt.hij'], c) <= 3) add(V['tt.hij'], 'inf-tt');
    if (V.vd && levenshtein(V.vd, c) <= 3) add(V.vd, 'inf-vd');
    if (/zen$/.test(c)) add(c.slice(0, -3) + 'sen', 'inf-z-als-s'); // verhuisen
    if (/ven$/.test(c)) add(c.slice(0, -3) + 'fen', 'inf-v-als-f');
  } else if (s === 'gw') {
    add(V['tt.hij'], 'gw-met-t'); // wordt
    if (stam.endsWith('d')) add(stam.slice(0, -1) + 't', 'gw-d-als-t'); // wort
    if (stam.endsWith('d')) add(stam + 't', 'gw-met-t');
    if (/s$/.test(stam) && /zen$/.test(inf)) add(stam.slice(0, -1) + 'z', 'gw-z-gehouden'); // reiz
    if (/f$/.test(stam) && /ven$/.test(inf)) add(stam.slice(0, -1) + 'v', 'gw-v-gehouden'); // geloov
  } else if (s === 'od.e' || s === 'od.kaal') {
    // los in de zin (Lachend vertelde hij) is -ende volgens Taaladvies ook niet fout: dan nooit als afleider
    if (s === 'od.e') add(V['od.kaal'], 'od-e-vergeten');
    else if (zin.eenHet) add(V['od.e'], 'od-e-teveel');
    add(c.replace(/d(e?)$/, 't$1'), 'od-t-ipv-d'); // lachent
    add(c.replace(/d(e?)$/, 'dt$1'), 'od-dt'); // lachendt
  } else if (s === 'bvd.e') {
    if (V['vt.ev'] && V['vt.ev'] !== c && levenshtein(V['vt.ev'], c) === 1) add(V['vt.ev'], 'bvd-vt-gelijk'); // verbrandde
    if (c !== V['bvd.kaal']) add(V['bvd.kaal'], 'bvd-e-vergeten'); // geoogst
    const k = V['bvd.kaal'];
    if (/[td]$/.test(k) && c !== k) {
      add(k + 'te', /t$/.test(k) ? 'bvd-extra-t' : 'bvd-te-ipv-de'); // geoogstte, verhuiste?
      add(k.slice(0, -1) + (k.endsWith('t') ? 'de' : 'te'), 'bvd-t-d-omgedraaid'); // geoogsde
      add(c + 'n', 'bvd-n-teveel'); // geoogsten
    }
    if (/en$/.test(c)) {
      add(c + 'e', 'bvd-e-teveel-sterk'); // gebrokene
      const z = zwakVd(ww);
      add(z + 'e', 'bvd-zwak-gemaakt'); // gebreekte
    }
  } else if (s === 'bvd.kaal') {
    if (V['bvd.e'] && V['bvd.e'] !== c) add(V['bvd.e'], 'bvd-e-teveel'); // een gekookte ei
    const r = ruil(c);
    if (r) add(r, 'bvd-t-d-omgedraaid');
  }
  return L;
}

/** Kiest twee afleiders en controleert ze. Geeft { afleiders, problemen }. */
export function kiesAfleiders(inf, ww, zin) {
  const ot = opentaal();
  const wnt = wntVormen(inf);
  const c = ww.vormen[zin.slot];
  const bSlot = zin.slot.startsWith('bvd') ? 'vd' : zin.slot;
  const goedHier = new Set([c, ...(wnt.slots[bSlot]?.gewoon || []), ...(wnt.slots[bSlot]?.archaisch || [])]);
  const echt = new Set([...ww.alleVormen, ...Object.values(ww.vormen)]);
  const maxAfstand = ww.soort === 'zwak' && zin.slot !== 'inf' ? 2 : 3;
  const problemen = [];

  const beoordeel = (k) => {
    if (goedHier.has(k.vorm)) return `${k.vorm} is op deze plek ook goed`;
    if (zin.slot.startsWith('bvd') && k.vorm === ww.vormen[zin.slot === 'bvd.e' ? 'bvd.e' : 'bvd.kaal']) return `${k.vorm} is op deze plek ook goed`;
    if (levenshtein(k.vorm, c) > maxAfstand) return `${k.vorm} wijkt te veel af van ${c}`;
    if (Math.abs(k.vorm.length - c.length) > (ww.soort === 'zwak' ? 2 : 3)) return `${k.vorm} is te veel langer of korter dan ${c}`;
    if (echt.has(k.vorm)) return null; // soort a
    if (ot.has(k.vorm) || ot.has(k.vorm.toLowerCase())) return `${k.vorm} bestaat als ander woord (OpenTaal)`;
    return null; // soort b
  };
  const soort = (k) => (echt.has(k.vorm) ? 'a' : 'b');

  let gekozen;
  if (zin.afl) {
    const alle = kandidaten(inf, ww, zin);
    gekozen = zin.afl.map((v) => alle.find((k) => k.vorm === v) || { vorm: v, patroon: null });
    for (const k of gekozen) {
      if (!k.patroon) problemen.push(`afleider ${k.vorm} past bij geen bekend foutpatroon`);
      const p = beoordeel(k);
      if (p) problemen.push(p);
    }
  } else {
    const ok = kandidaten(inf, ww, zin).filter((k) => !beoordeel(k));
    // liefst één echte vorm (a) en één spellingfout (b); anders de eerste twee
    // de volgorde van kandidaten() is de voorkeur; de tweede is liefst van de andere soort (a/b)
    const eerste = ok[0];
    const tweede = eerste && (ok.find((k) => k !== eerste && soort(k) !== soort(eerste)) || ok[1]);
    gekozen = [eerste, tweede].filter(Boolean);
    if (gekozen.length < 2) problemen.push(`te weinig goede afleiders (gevonden: ${ok.map((k) => k.vorm).join(', ') || 'geen'})`);
  }
  return { afleiders: gekozen.map((k) => ({ ...k, soort: soort(k) })), problemen };
}
