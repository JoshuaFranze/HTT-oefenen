// End-to-end-test van de hele app in een echte browser (Playwright, Chromium).
//   node tests/e2e.mjs            (start zelf een lokale server)
//
// Controleert: rooster op basis van de datum (toekomstige toetsen grijs), een toets maken
// met goede en foute antwoorden, uitleg, hint, opslaan na elk antwoord, hervatten na herladen,
// eindscherm, sync via een nagebootste GitHub Gist, samenvoegen van twee apparaten zonder verlies,
// en de weergave op een telefoon.

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';

// Playwright staat in deze omgeving globaal; in CI wordt het met npm geïnstalleerd.
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const ROOT = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('niet gevonden');
  }
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}/`;

// Voor de test tellen alle gebouwde toetsen als goedgekeurd (de review zelf test verifieer.mjs).
const gebouwd = readdirSync(join(ROOT, 'data/toetsen')).filter((f) => /^toets-\d+\.json$/.test(f)).map((f) => Number(f.match(/\d+/)[0]));
const status = { toetsen: Object.fromEntries(gebouwd.map((n) => [n, { goedgekeurd: true }])) };

// Nagebootste GitHub Gist-API (gedeeld door alle 'apparaten')
const gists = new Map();
let gistTeller = 1;
async function nepGitHub(route) {
  const req = route.request();
  const url = new URL(req.url());
  const auth = req.headers()['authorization'];
  if (auth !== 'Bearer ghp_testtoken') return route.fulfill({ status: 401, body: '{}' });
  const json = (o, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(o) });
  if (url.pathname === '/gists' && req.method() === 'GET') return json([...gists.values()]);
  if (url.pathname === '/gists' && req.method() === 'POST') {
    const b = JSON.parse(req.postData());
    const g = { id: 'g' + gistTeller++, files: b.files };
    gists.set(g.id, g);
    return json(g, 201);
  }
  const m = url.pathname.match(/^\/gists\/(\w+)$/);
  if (m) {
    const g = gists.get(m[1]);
    if (!g) return json({}, 404);
    if (req.method() === 'PATCH') {
      const b = JSON.parse(req.postData());
      for (const [k, v] of Object.entries(b.files)) g.files[k] = { content: v.content };
    }
    return json(g);
  }
  return json({}, 404);
}

const browser = await chromium.launch();
async function apparaat(opties = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opties });
  await ctx.route('**/data/review/status.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(status) }));
  await ctx.route('https://api.github.com/**', nepGitHub);
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', (r) => r.fulfill({ body: '' }));
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && fouten.push(m.text()));
  return { ctx, page, fouten };
}
const toets1 = JSON.parse(await readFile(join(ROOT, 'data/toetsen/toets-01.json'), 'utf8'));
let stap = 0;
const ok = (m) => console.log(`  ✓ ${++stap}. ${m}`);
mkdirSync(join(ROOT, 'screenshots'), { recursive: true });

try {
  // ---------- apparaat A ----------
  const A = await apparaat();
  const pa = A.page;
  await pa.goto(BASE + '?datum=2026-11-10#/');
  await pa.waitForSelector('text=Jouw volgende oefentoets');
  assert.match(await pa.textContent('body'), /Start toets 1/);
  assert.match(await pa.textContent('body'), /Beschikbaar vanaf donderdag 12 november/);
  assert.match(await pa.textContent('body'), /Testweergave/);
  ok('dashboard: toets 1 vrij, toets 2 grijs met datum, testdatum zichtbaar');

  await pa.goto(BASE + '?datum=2026-11-08#/');
  await pa.waitForSelector('text=Jouw volgende oefentoets');
  assert.equal(await pa.locator('a.toetskaart').count(), 0);
  ok('vóór 9 november is nog geen enkele toets te starten');

  await pa.goto(BASE + '?datum=2026-11-10#/toets/1');
  await pa.click('text=Start de toets');
  await pa.waitForSelector('.htt-vraagkop');
  assert.equal(await pa.textContent('.htt-vraagkop'), 'Welke werkwoordsvorm is juist gespeld?');
  assert.match(await pa.textContent('.htt-teller'), /Vraag 1 van 40/);
  assert.equal(await pa.locator('.htt-optie').count(), 3);
  ok('toetsscherm zoals de HTT: vraag, teller, drie opties');

  // hint
  await pa.click('[data-hint]');
  assert.match(await pa.textContent('.hint-blok'), /Hulp 1 van 3/);
  await pa.click('[data-hint]');
  await pa.click('[data-hint]');
  assert.equal(await pa.locator('.hint-stap').count(), 3);
  ok('hint in drie stapjes');

  // vraag 1 fout beantwoorden (met toets 1/2/3)
  const v1 = toets1.vragen[0];
  const fout1 = [0, 1, 2].find((i) => i !== v1.goed);
  await pa.keyboard.press(String(fout1 + 1));
  await pa.waitForSelector('.fb-zacht');
  const fb = await pa.textContent('.fb');
  assert.match(fb, /Het goede antwoord is/);
  assert.ok(fb.includes(v1.antwoord));
  assert.doesNotMatch(fb, /\b(fout|verkeerd)\b/i);
  const kleur = await pa.$eval('.fb', (e) => getComputedStyle(e).backgroundColor);
  assert.notEqual(kleur, 'rgb(255, 0, 0)');
  ok('fout antwoord: rustige uitlegkaart met het goede antwoord, zonder "fout"');
  await pa.screenshot({ path: join(ROOT, 'screenshots/toets-feedback.png') });

  // vraag 2 t/m 10 goed beantwoorden
  await pa.keyboard.press('Enter');
  for (let i = 1; i < 10; i++) {
    await pa.waitForFunction((n) => document.querySelector('.htt-teller')?.textContent.includes(`Vraag ${n} van 40`), i + 1);
    await pa.click(`[data-optie="${toets1.vragen[i].goed}"]`);
    await pa.waitForSelector('.fb-goed');
    await pa.click('[data-volgende]');
  }
  await pa.waitForFunction(() => document.querySelector('.htt-teller')?.textContent.includes('Vraag 11 van 40'));
  ok('tien vragen beantwoord, na elk antwoord verder');

  // herladen: precies verder bij vraag 11
  await pa.reload();
  await pa.waitForSelector('.htt-teller');
  assert.match(await pa.textContent('.htt-teller'), /Vraag 11 van 40/);
  await pa.click('[data-vorige]');
  await pa.waitForSelector('.fb-goed');
  ok('na herladen: verder bij vraag 11, eerdere antwoorden staan er nog');

  // stoppen en vanaf het dashboard verder
  await pa.click('[data-stop]');
  await pa.click('[data-weg]');
  await pa.waitForSelector('text=Verder met toets 1');
  await pa.click('text=Verder met toets 1');
  await pa.waitForSelector('.htt-teller');
  assert.match(await pa.textContent('.htt-teller'), /Vraag 11 van 40/);
  ok('stoppen en later verder vanaf het dashboard');

  // de rest afmaken
  for (let i = 10; i < 40; i++) {
    await pa.waitForFunction((n) => document.querySelector('.htt-teller')?.textContent.includes(`Vraag ${n} van 40`), i + 1);
    await pa.click(`[data-optie="${i % 7 === 0 ? (toets1.vragen[i].goed + 1) % 3 : toets1.vragen[i].goed}"]`);
    await pa.click('[data-volgende]');
  }
  await pa.waitForSelector('text=Klaar! Mooi gedaan.');
  const fouteN = 1 + [...Array(30)].filter((_, k) => (k + 10) % 7 === 0).length;
  assert.match(await pa.textContent('body'), new RegExp(`${40 - fouteN}\\s*van de 40`));
  assert.match(await pa.textContent('body'), /Om te onthouden/);
  ok(`eindscherm: ${40 - fouteN} van de 40, wat goed ging en valkuilen`);

  // koppelen met (nep)GitHub
  await pa.goto(BASE + '?datum=2026-11-10#/instellingen');
  await pa.fill('#token', 'ghp_testtoken');
  await pa.click('[data-koppel]');
  await pa.waitForFunction(() => /Veilig opgeslagen/.test(document.querySelector('[data-syncstatus]')?.textContent || ''), null, { timeout: 10000 });
  assert.equal(gists.size, 1);
  const online = JSON.parse([...gists.values()][0].files['htt-werkwoordspelling-voortgang.json'].content);
  assert.equal(Object.keys(online.antwoorden).length, 40);
  ok('gekoppeld: alle 40 antwoorden staan in de Gist');

  // ---------- apparaat B (telefoon) ----------
  const B = await apparaat({ ...devices['iPhone 13'] });
  const pb = B.page;
  await pb.goto(BASE + '?datum=2026-11-13#/instellingen');
  await pb.fill('#token', 'ghp_testtoken');
  await pb.click('[data-koppel]');
  await pb.waitForFunction(() => /Veilig opgeslagen/.test(document.querySelector('[data-syncstatus]')?.textContent || ''), null, { timeout: 10000 });
  await pb.goto(BASE + '?datum=2026-11-13#/');
  await pb.waitForSelector('text=Jouw volgende oefentoets');
  assert.match(await pb.textContent('body'), new RegExp(`Gemaakt: ${40 - fouteN} van 40`));
  ok('tweede apparaat haalt de voortgang op via de Gist');

  // op B toets 2 deels maken, op A intussen trainer: daarna mag er niets verdwijnen
  const toets2 = JSON.parse(await readFile(join(ROOT, 'data/toetsen/toets-02.json'), 'utf8'));
  await pb.goto(BASE + '?datum=2026-11-13#/maak/2');
  for (let i = 0; i < 5; i++) {
    await pb.waitForFunction((n) => document.querySelector('.htt-teller')?.textContent.includes(`Vraag ${n} van 40`), i + 1);
    await pb.click(`[data-optie="${toets2.vragen[i].goed}"]`);
    await pb.click('[data-volgende]');
  }
  const breed = await pb.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(breed <= 0, 'geen horizontale scroll op de telefoon');
  await pb.screenshot({ path: join(ROOT, 'screenshots/telefoon-toets.png') });
  ok('telefoon: toets 2 deels gemaakt, geen horizontale scroll');

  await pa.goto(BASE + '?datum=2026-11-13#/trainer/vd');
  await pa.waitForSelector('.htt-optie');
  await pa.click('[data-optie="0"]');
  await pa.waitForSelector('.fb');
  // beide apparaten synchroniseren
  await pb.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await pb.waitForTimeout(2500);
  await pa.goto(BASE + '?datum=2026-11-13#/');
  await pa.waitForSelector('text=Verder met toets 2', { timeout: 10000 });
  const pA = await pa.evaluate(() => JSON.parse(localStorage.getItem('htt.voortgang.v1')));
  assert.equal(Object.keys(pA.antwoorden).length, 45);
  assert.equal(Object.keys(pA.trainer.antwoorden).length, 1);
  assert.equal(pA.toetsen['1'].resultaten.length, 1);
  ok('samenvoegen: 40 + 5 antwoorden, trainerantwoord en resultaat van toets 1 zijn er allemaal');
  await pa.screenshot({ path: join(ROOT, 'screenshots/dashboard.png'), fullPage: true });

  // blocklist: vervangen vraag verandert de opgeslagen voortgang niet
  const geblokt = toets2.vragen[2];
  await pb.route('**/data/blocklist.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ vragen: [{ id: geblokt.id }] }) }));
  await pb.goto(BASE + '?datum=2026-11-13#/maak/2');
  await pb.waitForSelector('.htt-teller');
  const zin3 = await pb.evaluate(() => null);
  await pb.goto(BASE + '?datum=2026-11-13#/');
  const pB = await pb.evaluate(() => JSON.parse(localStorage.getItem('htt.voortgang.v1')));
  assert.ok(pB.antwoorden[`2|${geblokt.id}`], 'het oude antwoord blijft bewaard');
  ok('blocklist: vraag wordt vervangen, opgeslagen antwoorden blijven heel');

  for (const [naam, x] of [['A', A], ['B', B]]) assert.deepEqual(x.fouten, [], `geen JavaScript-fouten op apparaat ${naam}`);
  ok('geen JavaScript-fouten');
  console.log('\nAlle e2e-tests geslaagd.');
} catch (e) {
  console.error('\n✗ e2e-test mislukt:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
