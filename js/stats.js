// Statistieken en aanmoediging voor het dashboard. Altijd eerst het positieve,
// en nooit iets als achteruitgang laten zien.

export const CATEGORIE = {
  tt: 'Tegenwoordige tijd',
  vt: 'Verleden tijd',
  vd: 'Voltooid deelwoord',
  od: 'Onvoltooid deelwoord',
  inf: 'Infinitief',
  gw: 'Gebiedende wijs',
  eng: 'Engelse werkwoorden',
  bvd: 'Voltooid deelwoord voor een zelfstandig naamwoord',
};
export const KORT = { ...CATEGORIE, bvd: 'Bijvoeglijk gebruikt voltooid deelwoord' };

/** Alle afgeronde toetsresultaten, oud naar nieuw. */
export function resultaten(p) {
  const uit = [];
  for (const [n, t] of Object.entries(p.toetsen)) for (const r of t.resultaten || []) uit.push({ ...r, toets: Number(n) });
  return uit.sort((a, b) => a.t - b.t);
}

/** Per onderdeel: goed/totaal over de laatste drie afgeronde toetsen (of over alle losse antwoorden als er nog geen zijn). */
export function perOnderdeel(p) {
  const res = resultaten(p).slice(-3);
  const uit = Object.fromEntries(Object.keys(CATEGORIE).map((c) => [c, { goed: 0, totaal: 0 }]));
  if (res.length) {
    for (const r of res) for (const [c, x] of Object.entries(r.perCat || {})) if (uit[c]) { uit[c].goed += x.goed; uit[c].totaal += x.totaal; }
  } else {
    for (const a of Object.values(p.antwoorden)) if (uit[a.c]) { uit[a.c].totaal++; if (a.goed) uit[a.c].goed++; }
  }
  return uit;
}

/** Groei per onderdeel: eerste afgeronde toets tegenover de laatste. Alleen als het beter gaat. */
export function groei(p) {
  const res = resultaten(p);
  if (res.length < 2) return [];
  const eerste = res[0];
  const laatste = res.at(-1);
  const uit = [];
  for (const c of Object.keys(CATEGORIE)) {
    const a = eerste.perCat?.[c];
    const b = laatste.perCat?.[c];
    if (!a?.totaal || !b?.totaal) continue;
    if (b.goed / b.totaal > a.goed / a.totaal) uit.push({ c, tekst: `Bij ${KORT[c].toLowerCase()} ging het eerst ${a.goed} van ${a.totaal} goed, nu ${b.goed} van ${b.totaal}.` });
  }
  return uit;
}

/** Onderdeel om rustig nog eens te oefenen (nooit als "slecht" benoemd). */
export function oefenTip(p) {
  const po = perOnderdeel(p);
  const kandidaten = Object.entries(po).filter(([, x]) => x.totaal >= 4 && x.goed / x.totaal < 0.8).sort((a, b) => a[1].goed / a[1].totaal - b[1].goed / b[1].totaal);
  return kandidaten.length ? kandidaten[0][0] : null;
}

export function telling(p) {
  const res = resultaten(p);
  const gemaakt = new Set(res.map((r) => r.toets)).size;
  const vragen = Object.keys(p.antwoorden).length + Object.keys(p.trainer.antwoorden).length;
  return { gemaakt, keer: res.length, vragen, trainerRondes: p.trainer.rondes.length };
}

export function mijlpalen(p) {
  const { gemaakt, vragen } = telling(p);
  const res = resultaten(p);
  const m = [];
  if (gemaakt >= 1) m.push('Eerste toets gemaakt');
  for (const n of [5, 10, 15, 20]) if (gemaakt >= n) m.push(`${n} toetsen gemaakt`);
  for (const n of [100, 250, 500, 1000]) if (vragen >= n) m.push(`${n} vragen geoefend`);
  if (res.some((r) => r.hintGebruikt === 0)) m.push('Een hele toets zonder hint');
  if (p.trainer.rondes.length >= 1) m.push('Valkuilen-trainer gebruikt');
  const po = perOnderdeel(p);
  if (res.length >= 3 && Object.values(po).every((x) => x.totaal && x.goed / x.totaal >= 0.8)) m.push('Alle onderdelen 80% of meer');
  return m;
}

const weekVan = (t) => {
  const d = new Date(t);
  const maandag = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return maandag.getTime();
};

/** Echte aanmoediging, gebaseerd op wat ze gedaan heeft. Geeft een lijstje zinnen. */
export function aanmoediging(p, nu = Date.now()) {
  const res = resultaten(p);
  const zinnen = [];
  if (!res.length && !Object.keys(p.antwoorden).length) return ['Fijn dat je er bent. Begin rustig met de eerste toets. Er is geen tijdsdruk en je kunt altijd stoppen.'];
  if (res.length >= 2) {
    const laatste = res.at(-1);
    const score = (r) => r.goed / r.totaal;
    if (res.slice(0, -1).every((r) => score(laatste) > score(r))) zinnen.push('Je laatste toets was je beste tot nu toe.');
    else if (score(laatste) >= score(res.at(-2))) zinnen.push('Je laatste toets ging minstens zo goed als de toets daarvoor. Dat is mooi stabiel.');
  }
  // onderdeel dat drie toetsen op rij helemaal goed ging
  if (res.length >= 3) {
    for (const c of Object.keys(CATEGORIE)) {
      const r3 = res.slice(-3).map((r) => r.perCat?.[c]).filter((x) => x?.totaal);
      if (r3.length === 3 && r3.every((x) => x.goed === x.totaal)) {
        zinnen.push(`${KORT[c]} ging de laatste drie toetsen helemaal goed.`);
        break;
      }
    }
  }
  // zonder hint goed: deze week vs vorige week
  const dezeWeek = weekVan(nu);
  const vorigeWeek = dezeWeek - 7 * 86400000;
  const zonderHint = (van, tot) => Object.values(p.antwoorden).filter((a) => a.goed && !a.hint && a.t >= van && a.t < tot).length;
  const a = zonderHint(dezeWeek, dezeWeek + 7 * 86400000);
  const b = zonderHint(vorigeWeek, dezeWeek);
  if (a > b && b > 0) zinnen.push('Zonder hint ging het deze week vaker goed dan vorige week.');
  const g = groei(p);
  if (g.length) zinnen.push(g[Math.floor(nu / 86400000) % g.length].tekst);
  const { vragen } = telling(p);
  if (vragen >= 40) zinnen.push(`Je hebt al ${vragen} vragen geoefend. Elke vraag maakt de regels een beetje vaster.`);
  if (!zinnen.length) zinnen.push('Je bent goed bezig. Elke toets die je maakt, helpt.');
  // elke dag een andere volgorde, maximaal twee zinnen
  const start = Math.floor(nu / 86400000) % zinnen.length;
  return [...zinnen.slice(start), ...zinnen.slice(0, start)].slice(0, 2);
}

/** Resultaat van één afgeronde toets. */
export function maakResultaat(vragen, antwoorden, extra = {}) {
  const perCat = {};
  let goed = 0;
  let hintGebruikt = 0;
  let zonderHintGoed = 0;
  for (const v of vragen) {
    const a = antwoorden[v.id];
    perCat[v.categorie] ||= { goed: 0, totaal: 0 };
    perCat[v.categorie].totaal++;
    if (a?.goed) { goed++; perCat[v.categorie].goed++; }
    if (a?.hint) hintGebruikt++;
    if (a?.goed && !a.hint) zonderHintGoed++;
  }
  return { t: Date.now(), goed, totaal: vragen.length, perCat, hintGebruikt, zonderHintGoed, ...extra };
}
