// Kleine hulpmiddelen voor de schermen.

import { leesInstellingen } from './storage.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Zin met de open plek als lijntje (zoals in de HTT). */
export function zinMetGat(zin, invulling = null, klasse = '') {
  const [voor, na] = zin.split('___');
  const gat = invulling ? `<span class="gat gat-vol ${klasse}">${esc(invulling)}</span>` : '<span class="gat" aria-label="open plek"></span>';
  return `${esc(voor)}${gat}${esc(na)}`;
}

export function pasToegankelijkheidToe(inst = leesInstellingen()) {
  const r = document.documentElement;
  r.dataset.grootte = inst.lettergrootte;
  r.dataset.contrast = inst.contrast ? 'hoog' : 'normaal';
  r.dataset.lettertype = inst.lettertype;
}

let open = null;
export function sluitModal() {
  if (!open) return;
  open.el.remove();
  document.removeEventListener('keydown', open.esc);
  const terug = open.terug;
  open = null;
  terug?.focus?.();
}

/** Opent een rustig venster. inhoud = HTML. Geeft het element terug. */
export function modal(inhoud, { titel = '', breed = false } = {}) {
  sluitModal();
  const el = document.createElement('div');
  el.className = 'modal-achter';
  el.innerHTML = `<div class="modal ${breed ? 'modal-breed' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titel)}">
    <button class="modal-sluit" type="button" aria-label="Sluiten" data-sluit>×</button>
    ${titel ? `<h2 class="text-xl font-extrabold mb-3 pr-8">${esc(titel)}</h2>` : ''}
    <div>${inhoud}</div></div>`;
  document.getElementById('modal-root').appendChild(el);
  const escH = (e) => e.key === 'Escape' && sluitModal();
  open = { el, esc: escH, terug: document.activeElement };
  document.addEventListener('keydown', escH);
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-sluit]')) sluitModal();
  });
  setTimeout(() => el.querySelector('button, input, textarea, select, a')?.focus(), 30);
  return el;
}

export function melding(tekst) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = tekst;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('weg'), 2600);
  setTimeout(() => el.remove(), 3200);
}

/** Ademhalingsoefening (zoals bij de RWT-site). */
export function rustmoment() {
  const el = modal(
    `<div class="text-center">
      <p class="text-zacht mb-4">Volg de cirkel. Adem in als hij groter wordt en adem langzaam uit als hij kleiner wordt.</p>
      <div class="adem-cirkel mx-auto" aria-hidden="true"></div>
      <p class="text-2xl font-extrabold text-accent mt-4" data-adem aria-live="polite">Adem in…</p>
      <p class="text-sm text-zacht mt-4">Een valkuil is gewoon een stap in het leren. Neem de tijd die je nodig hebt.</p>
    </div>`,
    { titel: 'Even een rustmoment' },
  );
  let s = 0;
  const t = el.querySelector('[data-adem]');
  const iv = setInterval(() => {
    if (!document.body.contains(el)) return clearInterval(iv);
    s = (s + 1) % 10;
    t.textContent = s < 4 ? 'Adem in…' : s < 6 ? 'Even vasthouden' : 'En rustig uit…';
  }, 1000);
}

export function toegankelijkheidPaneel(opslaan) {
  const inst = leesInstellingen();
  const el = modal(
    `<div class="space-y-5">
      <fieldset><legend class="font-bold mb-2">Lettergrootte</legend>
        <div class="flex gap-2 flex-wrap">${['normaal', 'groot', 'extra'].map((g) => `<button type="button" class="knop knop-rand" data-grootte="${g}" aria-pressed="${inst.lettergrootte === g}">${g === 'extra' ? 'Extra groot' : g[0].toUpperCase() + g.slice(1)}</button>`).join('')}</div></fieldset>
      <fieldset><legend class="font-bold mb-2">Lettertype</legend>
        <div class="flex gap-2 flex-wrap"><button type="button" class="knop knop-rand" data-type="standaard" aria-pressed="${inst.lettertype === 'standaard'}">Standaard</button><button type="button" class="knop knop-rand lettertype-leesbaar" data-type="leesbaar" aria-pressed="${inst.lettertype === 'leesbaar'}">Extra leesbaar</button></div></fieldset>
      <label class="flex items-center gap-3 font-bold"><input type="checkbox" data-contrast ${inst.contrast ? 'checked' : ''} class="w-5 h-5"> Hoog contrast</label>
    </div>`,
    { titel: 'Toegankelijkheid' },
  );
  el.addEventListener('click', (e) => {
    const g = e.target.closest('[data-grootte]');
    const t = e.target.closest('[data-type]');
    if (g) opslaan({ lettergrootte: g.dataset.grootte });
    if (t) opslaan({ lettertype: t.dataset.type });
    if (g || t) {
      el.querySelectorAll(g ? '[data-grootte]' : '[data-type]').forEach((b) => b.setAttribute('aria-pressed', b === (g || t)));
    }
  });
  el.querySelector('[data-contrast]').addEventListener('change', (e) => opslaan({ contrast: e.target.checked }));
}

export function download(naam, tekst, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([tekst], { type }));
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
