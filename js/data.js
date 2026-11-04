// Inladen van de vaste data (toetsen, trainer, regels, config, blocklist).

const cache = new Map();
async function haal(pad) {
  if (!cache.has(pad)) {
    cache.set(
      pad,
      fetch(pad, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`Kon ${pad} niet laden (${r.status})`);
        return r.json();
      }),
    );
  }
  return cache.get(pad);
}

export const laadConfig = () => haal('data/config.json');
export const laadRegels = () => haal('data/regels.json');
export const laadTrainer = () => haal('data/trainer.json');
export async function laadBlocklist() {
  try {
    return new Set((await haal('data/blocklist.json')).vragen.map((b) => b.id));
  } catch {
    return new Set();
  }
}
/** Welke toetsen zijn gebouwd én goedgekeurd? */
export async function laadGebouwd() {
  const s = await haal('data/review/status.json');
  return new Set(Object.entries(s.toetsen).filter(([k, v]) => /^\d+$/.test(k) && v.goedgekeurd).map(([k]) => Number(k)));
}
export const laadToets = (n) => haal(`data/toetsen/toets-${String(n).padStart(2, '0')}.json`);

/**
 * De vragen die nu in de toets staan. Staat een vraag op de blocklist, dan valt de eerste
 * vrije reservevraag uit hetzelfde onderdeel in. Zo blijft de toets 40 vragen.
 */
export function actieveVragen(toets, blocklist) {
  const gebruikt = new Set();
  return toets.vragen.map((v) => {
    if (!blocklist.has(v.id)) return v;
    const r = toets.reserves.find((x) => x.categorie === v.categorie && !blocklist.has(x.id) && !gebruikt.has(x.id));
    if (!r) return v;
    gebruikt.add(r.id);
    return { ...r, vervangt: v.id };
  });
}
