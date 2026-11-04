// Het toetsscherm, zo veel mogelijk zoals de echte HTT.
// Modi: 'oefen' (oefentoets), 'simulatie' (zoals de echte toets: geen hint, uitleg pas aan het eind), 'trainer'.

import { esc, zinMetGat, modal, sluitModal, toegankelijkheidPaneel, rustmoment, melding } from './ui.js';
import { leesVoortgang, bewaarAntwoord, huidigAntwoord, bewaarToetsInfo, rondToetsAf, leesInstellingen, schrijfInstellingen, bewaarMelding, bewaarTrainerAntwoord, bewaarTrainerRonde } from './storage.js';
import { maakResultaat, CATEGORIE, KORT } from './stats.js';
import { pasToegankelijkheidToe } from './ui.js';

const VRAAG = 'Welke werkwoordsvorm is juist gespeld?';
const GOED = ['Goed zo!', 'Helemaal goed.', 'Klopt!', 'Mooi, dat is goed.', 'Goed gedaan.'];

/**
 * Start een toets in het element `app`.
 * cfg: { modus, nummer, hash, vragen, config, terug(), naarEind(resultaat) }
 */
export function startToets(app, cfg) {
  const { modus, nummer, hash, vragen, config } = cfg;
  const inst = leesInstellingen();
  const direct = modus === 'trainer' || (modus === 'oefen' && inst.feedback === 'direct');
  const hintStand = modus === 'simulatie' ? 'uit' : modus === 'trainer' ? 'groot' : nummer <= config.hint.prominentTot ? 'groot' : nummer <= config.hint.kleinTot ? 'klein' : inst.hintAltijd ? 'klein' : 'uit';
  const toetsKey = modus === 'trainer' ? null : String(nummer);
  const ondertitel = modus === 'trainer' ? 'Valkuilen-trainer' : modus === 'simulatie' ? `Toets-simulatie (toets ${nummer})` : `Oefentoets ${nummer}`;

  // antwoorden van deze ronde
  const antwoorden = {};
  const trainerSessie = {};
  const laadAntwoorden = () => {
    if (modus === 'trainer') return;
    const p = leesVoortgang();
    for (const v of vragen) {
      const a = huidigAntwoord(p, toetsKey, v.id);
      if (a) antwoorden[v.id] = a;
    }
  };
  laadAntwoorden();
  const bron = () => (modus === 'trainer' ? trainerSessie : antwoorden);
  const hintNiveau = {};

  let index = Math.min(vragen.findIndex((v) => !bron()[v.id]), vragen.length - 1);
  if (index < 0) index = vragen.length - 1;
  if (modus !== 'trainer') bewaarToetsInfo(toetsKey, { hash, modus, positie: index });

  function kop() {
    const beantwoord = vragen.filter((v) => bron()[v.id]).length;
    const pct = Math.round((beantwoord / vragen.length) * 100);
    return `<header class="htt-kop">
      <div class="htt-titel"><div class="htt-t1">Werkwoordspelling</div><div class="htt-t2">${esc(ondertitel)}</div></div>
      <div class="htt-midden">
        <div class="htt-teller" aria-live="polite">Vraag ${index + 1} van ${vragen.length}</div>
        <div class="htt-balk" role="progressbar" aria-valuemin="0" aria-valuemax="${vragen.length}" aria-valuenow="${beantwoord}" aria-label="${beantwoord} van ${vragen.length} vragen beantwoord"><span style="width:${Math.max(pct, 1.5)}%"></span></div>
      </div>
      <div class="htt-rechts">
        <button type="button" class="htt-knop-tekst" data-toegankelijk><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9H15V22H13V16H11V22H9V9H3V7H21Z"/></svg><span class="hidden sm:inline">Toegankelijkheid</span></button>
        <button type="button" class="htt-sluit" data-stop aria-label="Stoppen en later verder">×</button>
      </div>
    </header>`;
  }

  function optieKnoppen(v, a) {
    return v.opties
      .map((o, i) => {
        let klasse = '';
        let extra = '';
        if (a && direct) {
          if (i === v.goed) { klasse = 'is-goed'; extra = '<span class="htt-markering" aria-hidden="true">✓</span>'; }
          else if (o === a.k) klasse = 'is-gekozen-niet';
        } else if (a && o === a.k) klasse = 'is-gekozen';
        return `<button type="button" class="htt-optie ${klasse}" data-optie="${i}" ${a && direct ? 'disabled' : ''} aria-pressed="${a?.k === o}"><span class="htt-nr">${i + 1}</span><span class="htt-optie-tekst">${esc(o)}</span>${extra}</button>`;
      })
      .join('');
  }

  function hintBlok(v, a) {
    if (hintStand === 'uit' || (a && direct)) return '';
    const n = hintNiveau[v.id] || 0;
    const getoond = v.hints.slice(0, n).map((h, i) => `<div class="hint-stap"><div class="hint-label">Hulp ${i + 1} van 3</div>${esc(h).replace(/\n/g, '<br>')}</div>`).join('');
    const knop = n < 3 ? `<button type="button" class="${hintStand === 'groot' && n === 0 ? 'knop knop-zacht' : 'link-zacht'}" data-hint>${n === 0 ? 'Hulp bij de regel' : 'Nog een stapje hulp'}</button>` : '';
    return `<div class="hint-blok" aria-live="polite">${getoond}${knop}</div>`;
  }

  function feedbackKaart(v, a) {
    if (!a || !direct) return '';
    if (a.goed) {
      return `<div class="fb fb-goed" role="status"><p class="fb-kop">${GOED[(index + v.id.length) % GOED.length]}</p><p>${esc(v.uitleg.kort)}</p></div>`;
    }
    const kop = v.instinker ? (index % 2 ? 'Slimme valkuil' : 'Dit is een bekende instinker') : 'Net niet';
    return `<div class="fb fb-zacht" role="status">
      <p class="fb-kop">${kop}</p>
      <p>Het goede antwoord is <strong>${esc(v.antwoord)}</strong>. ${esc(v.uitleg.kort)}</p>
      ${v.uitleg.perAfleider[a.k] ? `<p class="mt-2"><strong>${esc(a.k)}</strong>${esc(v.uitleg.perAfleider[a.k].slice(a.k.length))}</p>` : ''}
      <details class="mt-3"><summary class="font-bold cursor-pointer">Zo pak je het aan (stappenplan)</summary><ol class="stappen">${v.uitleg.stappen.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>
      <p class="fb-onthoud"><strong>Onthoud:</strong> ${esc(v.uitleg.onthoud)}</p>
    </div>`;
  }

  function render() {
    const v = vragen[index];
    const a = bron()[v.id];
    const laatste = index === vragen.length - 1;
    const alles = vragen.every((x) => bron()[x.id]);
    const volgendeTekst = laatste ? (direct ? 'Afronden' : 'Inleveren') : 'Volgende';
    const magVerder = direct ? !!a : true;
    app.innerHTML = `<div class="htt">${kop()}
      <main class="htt-vraag" id="main" tabindex="-1">
        <h1 class="htt-vraagkop">${VRAAG}</h1>
        <p class="htt-zin">${zinMetGat(v.zin, a && direct ? v.antwoord : null, 'gat-goed')}</p>
        <div class="htt-opties" role="group" aria-label="Antwoorden">${optieKnoppen(v, a)}</div>
        ${hintBlok(v, a)}
        ${feedbackKaart(v, a)}
        <div class="htt-nav">
          <button type="button" class="knop knop-rand" data-vorige ${index === 0 ? 'disabled' : ''}>Vorige</button>
          <button type="button" class="link-zacht" data-melden>Klopt dit wel?</button>
          <button type="button" class="knop knop-primair" data-volgende ${magVerder ? '' : 'disabled'}>${volgendeTekst}</button>
        </div>
        ${!direct && laatste && !alles ? `<p class="text-sm text-zacht text-center mt-3">Nog niet alles is ingevuld. Je kunt terugbladeren met Vorige.</p>` : ''}
        <p class="htt-tip">Tip: kies met de toetsen 1, 2 en 3. Je voortgang wordt na elk antwoord bewaard.</p>
      </main></div>`;
    document.title = `Vraag ${index + 1} – ${ondertitel}`;
  }

  function kies(i) {
    const v = vragen[index];
    const bestaand = bron()[v.id];
    if (bestaand && direct) return;
    const keuze = v.opties[i];
    const hint = hintNiveau[v.id] || bestaand?.hint || 0;
    if (modus === 'trainer') {
      trainerSessie[v.id] = { k: keuze, goed: keuze === v.antwoord, hint, t: Date.now() };
      bewaarTrainerAntwoord(v, keuze, hint);
    } else {
      antwoorden[v.id] = { k: keuze, goed: keuze === v.antwoord, hint, t: Date.now() };
      bewaarAntwoord(toetsKey, hash, v, keuze, { hint, modus, positie: index });
    }
    render();
    const fb = app.querySelector('.fb');
    if (fb) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    (app.querySelector('[data-volgende]:not([disabled])') || app.querySelector('main'))?.focus();
  }

  function ga(n) {
    index = Math.max(0, Math.min(vragen.length - 1, n));
    if (modus !== 'trainer') bewaarToetsInfo(toetsKey, { positie: index });
    render();
    app.querySelector('main')?.focus();
    window.scrollTo(0, 0);
  }

  function volgende() {
    if (index < vragen.length - 1) return ga(index + 1);
    // laatste vraag
    const open = vragen.filter((v) => !bron()[v.id]);
    if (open.length) {
      return modal(`<p>Je hebt nog ${open.length} ${open.length === 1 ? 'vraag' : 'vragen'} niet ingevuld. Wil je die eerst nog doen?</p>
        <div class="flex gap-3 flex-wrap mt-5"><button class="knop knop-primair" data-naar-open>Ja, naar de eerste open vraag</button><button class="knop knop-rand" data-sluit>Nee, nog even kijken</button></div>`, { titel: 'Bijna klaar' }).querySelector('[data-naar-open]').addEventListener('click', () => { sluitModal(); ga(vragen.indexOf(open[0])); });
    }
    afronden();
  }

  function afronden() {
    if (modus === 'trainer') {
      const r = maakResultaat(vragen, trainerSessie, { categorieen: [...new Set(vragen.map((v) => v.categorie))] });
      bewaarTrainerRonde(r);
      return cfg.naarEind(r);
    }
    const r = maakResultaat(vragen, antwoorden, { hash, simulatie: modus === 'simulatie' || !direct });
    rondToetsAf(toetsKey, r);
    cfg.naarEind(r);
  }

  function stop() {
    modal(`<p>Alles wat je hebt ingevuld is bewaard. Je kunt later precies hier verdergaan.</p>
      <div class="flex gap-3 flex-wrap mt-5"><button class="knop knop-primair" data-door>Verder met de toets</button><button class="knop knop-rand" data-weg>Stoppen voor nu</button><button class="knop knop-zacht" data-rust>Even rustmoment</button></div>`, { titel: 'Even stoppen?' });
    const m = document.querySelector('.modal');
    m.querySelector('[data-door]').addEventListener('click', sluitModal);
    m.querySelector('[data-weg]').addEventListener('click', () => { sluitModal(); cfg.terug(); });
    m.querySelector('[data-rust]').addEventListener('click', rustmoment);
  }

  function meldVraag() {
    const v = vragen[index];
    const el = modal(`<p class="mb-3">Denk je dat er iets niet klopt aan deze vraag? Schrijf kort op wat je opvalt. Joshua kijkt ernaar en kan de vraag uitzetten.</p>
      <p class="text-sm text-zacht mb-2">${esc(v.zin)}</p>
      <textarea class="invoer" rows="3" data-tekst placeholder="Bijvoorbeeld: volgens mij is optie 2 ook goed."></textarea>
      <div class="flex gap-3 mt-4"><button class="knop knop-primair" data-stuur>Opslaan</button><button class="knop knop-rand" data-sluit>Annuleren</button></div>`, { titel: 'Klopt dit wel?' });
    el.querySelector('[data-stuur]').addEventListener('click', () => {
      const tekst = el.querySelector('[data-tekst]').value.trim();
      bewaarMelding({ id: `${Date.now().toString(36)}-${v.id}`, qid: v.id, toets: toetsKey || 'trainer', zin: v.zin, tekst, t: Date.now() });
      sluitModal();
      melding('Dank je! Je melding is bewaard.');
    });
  }

  app.onclick = (e) => {
    const o = e.target.closest('[data-optie]');
    if (o && !o.disabled) return kies(Number(o.dataset.optie));
    if (e.target.closest('[data-hint]')) {
      const v = vragen[index];
      hintNiveau[v.id] = Math.min(3, (hintNiveau[v.id] || 0) + 1);
      render();
      return app.querySelectorAll('.hint-stap')[hintNiveau[v.id] - 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (e.target.closest('[data-volgende]')) return volgende();
    if (e.target.closest('[data-vorige]')) return ga(index - 1);
    if (e.target.closest('[data-stop]')) return stop();
    if (e.target.closest('[data-melden]')) return meldVraag();
    if (e.target.closest('[data-toegankelijk]')) return toegankelijkheidPaneel((x) => { schrijfInstellingen(x); pasToegankelijkheidToe(); });
  };
  const toetsen = (e) => {
    if (!document.body.contains(app.querySelector('.htt'))) return document.removeEventListener('keydown', toetsen);
    if (document.querySelector('.modal') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (['1', '2', '3'].includes(e.key)) {
      const b = app.querySelector(`[data-optie="${Number(e.key) - 1}"]`);
      if (b && !b.disabled) { e.preventDefault(); kies(Number(e.key) - 1); }
    } else if (e.key === 'Enter' && !e.target.closest('button')) {
      const b = app.querySelector('[data-volgende]');
      if (b && !b.disabled) { e.preventDefault(); volgende(); }
    } else if (e.key === 'ArrowRight') {
      const b = app.querySelector('[data-volgende]');
      if (b && !b.disabled && index < vragen.length - 1) ga(index + 1);
    } else if (e.key === 'ArrowLeft' && index > 0) ga(index - 1);
  };
  document.addEventListener('keydown', toetsen);
  render();
  app.querySelector('main')?.focus();
}

/** Eindscherm: eerst wat goed ging, dan maximaal drie valkuilen om te onthouden. */
export function eindScherm(app, { vragen, antwoorden, resultaat, titel, scoreTonen, knoppen }) {
  const per = resultaat.perCat;
  const goedeOnderdelen = Object.entries(per).filter(([, x]) => x.totaal && x.goed / x.totaal >= 0.7).sort((a, b) => b[1].goed / b[1].totaal - a[1].goed / a[1].totaal);
  const gemist = vragen.filter((v) => antwoorden[v.id] && !antwoorden[v.id].goed);
  const valkuilen = [];
  for (const v of gemist) if (!valkuilen.some((x) => x.regel === v.regel) && valkuilen.length < 3) valkuilen.push(v);
  const open = vragen.filter((v) => !antwoorden[v.id]).length;
  app.innerHTML = `<section class="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <div class="kaart p-6 sm:p-8 text-center">
      <p class="text-sm font-bold text-accent uppercase tracking-wide">${esc(titel)}</p>
      <h1 class="text-3xl font-extrabold mt-1">Klaar! Mooi gedaan.</h1>
      ${scoreTonen ? `<p class="text-xl mt-3"><strong>${resultaat.goed}</strong> van de ${resultaat.totaal} vragen goed${resultaat.zonderHintGoed !== undefined && resultaat.hintGebruikt ? `, waarvan ${resultaat.zonderHintGoed} zonder hint` : ''}.</p>` : `<p class="text-lg mt-3 text-zacht">Je score staat verborgen. Je kunt hem altijd zien in de instellingen.</p>`}
      ${open ? `<p class="text-zacht mt-2">${open} ${open === 1 ? 'vraag is' : 'vragen zijn'} niet ingevuld.</p>` : ''}
    </div>
    <div class="kaart p-6">
      <h2 class="text-xl font-extrabold mb-3">Dit ging goed</h2>
      ${goedeOnderdelen.length ? `<ul class="space-y-2">${goedeOnderdelen.map(([c, x]) => `<li class="flex justify-between gap-3"><span>${esc(KORT[c])}</span><span class="font-bold text-accent">${scoreTonen ? `${x.goed} van ${x.totaal}` : '✓'}</span></li>`).join('')}</ul>` : '<p>Je hebt alle onderdelen geoefend. Elke keer dat je dit doet, worden de regels vaster.</p>'}
    </div>
    ${valkuilen.length ? `<div class="kaart p-6"><h2 class="text-xl font-extrabold mb-1">Om te onthouden</h2><p class="text-zacht mb-3">Hooguit drie dingen, meer hoeft niet.</p><ul class="space-y-3">${valkuilen.map((v) => `<li class="valkuil"><strong>${esc(CATEGORIE[v.categorie])}:</strong> ${esc(v.uitleg.onthoud)}</li>`).join('')}</ul></div>` : ''}
    <div class="flex flex-wrap gap-3 justify-center">${knoppen}</div>
    <details class="kaart p-6"><summary class="font-bold cursor-pointer">Alle vragen en uitleg bekijken</summary>
      <ol class="mt-4 space-y-4">${vragen.map((v) => {
        const a = antwoorden[v.id];
        return `<li class="terugblik ${a?.goed ? 'tb-goed' : 'tb-zacht'}"><p>${zinMetGat(v.zin, v.antwoord, 'gat-goed')}</p>
          <p class="text-sm mt-1">${a ? (a.goed ? 'Goed' : `Jij koos ${esc(a.k)}. Goed is <strong>${esc(v.antwoord)}</strong>.`) : 'Niet ingevuld.'}</p>
          ${a && !a.goed ? `<p class="text-sm mt-1">${esc(v.uitleg.kort)}</p>${v.uitleg.perAfleider[a.k] ? `<p class="text-sm mt-1 text-zacht">${esc(v.uitleg.perAfleider[a.k])}</p>` : ''}` : ''}</li>`;
      }).join('')}</ol></details>
  </section>`;
  window.scrollTo(0, 0);
}
