// Voortgang synchroniseren via een geheime GitHub Gist (zelfde aanpak als de RWT-site).
// Nodig: een GitHub Personal Access Token met alleen de scope "gist".
// Dit bestand heeft een eigen naam, dus hetzelfde token als bij RWT kan gewoon.

import { leesVoortgang, schrijfVoortgang, samenvoegen, leesGeheim, schrijfGeheim } from './storage.js';

const API = 'https://api.github.com';
export const BESTAND = 'htt-werkwoordspelling-voortgang.json';
const OMSCHRIJVING = 'HTT werkwoordspelling – voortgang (automatisch bijgehouden)';

let status = { staat: 'uit', tekst: 'Niet gekoppeld', tijd: null };
const luisteraars = new Set();
export function opStatus(fn) {
  luisteraars.add(fn);
  fn(status);
  return () => luisteraars.delete(fn);
}
function zet(staat, tekst) {
  status = { staat, tekst, tijd: Date.now() };
  try {
    localStorage.setItem('htt.syncstatus', JSON.stringify(status));
  } catch {}
  luisteraars.forEach((f) => f(status));
}
export const huidigeStatus = () => status;

async function gh(pad, token, opties = {}) {
  const res = await fetch(API + pad, {
    ...opties,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opties.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (res.status === 401) throw new Error('Het GitHub-token klopt niet of is verlopen.');
  if (res.status === 403) throw new Error('GitHub weigert de toegang. Heeft het token de scope "gist"?');
  if (res.status === 404) {
    const e = new Error('Gist niet gevonden.');
    e.code = 404;
    throw e;
  }
  if (!res.ok) throw new Error(`GitHub gaf een fout (${res.status}).`);
  return res.json();
}

async function inhoudVan(gist, token) {
  const f = gist.files?.[BESTAND];
  if (!f) return null;
  let tekst = f.content;
  if (f.truncated && f.raw_url) {
    const r = await fetch(f.raw_url, { headers: { Authorization: `Bearer ${token}` } });
    tekst = await r.text();
  }
  try {
    return JSON.parse(tekst);
  } catch {
    return null;
  }
}

async function zoekOfMaakGist(token) {
  const { gistId } = leesGeheim();
  if (gistId) {
    try {
      return await gh(`/gists/${gistId}`, token);
    } catch (e) {
      if (e.code !== 404) throw e;
    }
  }
  // een bestaande voortgangs-gist zoeken (bijvoorbeeld gemaakt op een ander apparaat)
  for (let pagina = 1; pagina <= 10; pagina++) {
    const lijst = await gh(`/gists?per_page=100&page=${pagina}`, token);
    const hit = lijst.find((g) => g.files && g.files[BESTAND]);
    if (hit) {
      schrijfGeheim({ gistId: hit.id });
      return gh(`/gists/${hit.id}`, token);
    }
    if (lijst.length < 100) break;
  }
  const nieuw = await gh('/gists', token, {
    method: 'POST',
    body: JSON.stringify({ description: OMSCHRIJVING, public: false, files: { [BESTAND]: { content: JSON.stringify(leesVoortgang()) } } }),
  });
  schrijfGeheim({ gistId: nieuw.id });
  return nieuw;
}

let bezig = null;
let nogEens = false;

/** Haalt de voortgang op, voegt samen en schrijft terug. Er gaat nooit iets verloren. */
export async function synchroniseer() {
  const { token } = leesGeheim();
  if (!token) {
    zet('uit', 'Niet gekoppeld');
    return { ok: false, reden: 'geen-token' };
  }
  if (bezig) {
    nogEens = true;
    return bezig;
  }
  bezig = (async () => {
    zet('bezig', 'Bezig met opslaan…');
    try {
      const gist = await zoekOfMaakGist(token);
      const remote = await inhoudVan(gist, token);
      const lokaal = leesVoortgang();
      const samen = samenvoegen(lokaal, remote);
      const tekst = JSON.stringify(samen);
      if (tekst !== JSON.stringify(lokaal)) schrijfVoortgang(samen, { stil: true });
      if (!remote || tekst !== JSON.stringify(remote)) {
        await gh(`/gists/${gist.id}`, token, { method: 'PATCH', body: JSON.stringify({ files: { [BESTAND]: { content: tekst } } }) });
      }
      zet('ok', 'Veilig opgeslagen');
      window.dispatchEvent(new CustomEvent('htt:gesynchroniseerd'));
      return { ok: true };
    } catch (e) {
      zet('fout', navigator.onLine === false ? 'Geen internet. Je voortgang staat veilig op dit apparaat en gaat mee zodra je weer online bent.' : `Opslaan online lukte niet: ${e.message} Je voortgang staat wel veilig op dit apparaat.`);
      return { ok: false, reden: e.message };
    } finally {
      bezig = null;
      if (nogEens) {
        nogEens = false;
        setTimeout(synchroniseer, 500);
      }
    }
  })();
  return bezig;
}

let timer = null;
export function startAutoSync() {
  window.addEventListener('htt:voortgang', () => {
    if (!leesGeheim().token) return;
    clearTimeout(timer);
    zet('wacht', 'Wordt zo online opgeslagen…');
    timer = setTimeout(synchroniseer, 2000);
  });
  window.addEventListener('online', () => synchroniseer());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') synchroniseer();
    // bij wegklikken: wat nog wacht meteen versturen
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      timer = null;
      synchroniseer();
    }
  });
  synchroniseer();
}

/** Alleen het token testen (voor de knop in de instellingen). */
export async function testToken(token) {
  try {
    const res = await fetch(API + '/gists?per_page=1', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, reden: 'Dit token wordt niet geaccepteerd.' };
    return { ok: false, reden: `GitHub antwoordde met status ${res.status}. Controleer de scope "gist".` };
  } catch {
    return { ok: false, reden: 'Geen verbinding met GitHub.' };
  }
}
