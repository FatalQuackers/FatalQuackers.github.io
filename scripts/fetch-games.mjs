// Fetches stats for the Roblox games listed in data/games.config.json and writes data/games.json.
// Runs in GitHub Actions (see .github/workflows/roblox-games.yml). Node 20+, no dependencies.
import { readFile, writeFile } from 'node:fs/promises';

const cfg = JSON.parse(await readFile('data/games.config.json', 'utf8'));
const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (r.ok) return r.json();
    if (r.status === 429) { await new Promise(s => setTimeout(s, 2000 * (i + 1))); continue; }
    throw new Error(`${r.status} ${url}`);
  }
  throw new Error(`rate limited: ${url}`);
};
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const universes = new Set();
for (const place of cfg.places || []) {
  try { universes.add((await get(`https://apis.roblox.com/universes/v1/places/${place}/universe`)).universeId); }
  catch (e) { console.warn('place', place, e.message); }
}
for (const [kind, ids] of [['groups', cfg.groups || []], ['users', cfg.users || []]]) {
  for (const id of ids) {
    let cursor = '';
    do {
      try {
        const res = await get(`https://games.roblox.com/v2/${kind}/${id}/games?accessFilter=2&limit=50&sortOrder=Desc${cursor ? '&cursor=' + cursor : ''}`);
        res.data.forEach(g => universes.add(g.id));
        cursor = res.nextPageCursor || '';
      } catch (e) { console.warn(kind, id, e.message); cursor = ''; }
    } while (cursor);
  }
}

const ids = [...universes].filter(Boolean);
const games = [];
for (const part of chunk(ids, 50)) {
  const q = part.join(',');
  const [details, votes, icons, thumbs] = await Promise.all([
    get(`https://games.roblox.com/v1/games?universeIds=${q}`),
    get(`https://games.roblox.com/v1/games/votes?universeIds=${q}`).catch(() => ({ data: [] })),
    get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${q}&size=512x512&format=Png&isCircular=false`).catch(() => ({ data: [] })),
    get(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${q}&countPerUniverse=4&defaults=true&size=768x432&format=Png&isCircular=false`).catch(() => ({ data: [] }))
  ]);
  for (const d of details.data) {
    const v = votes.data.find(x => x.id === d.id) || {};
    games.push({
      universeId: d.id, placeId: d.rootPlaceId, name: d.name, description: d.description || '',
      creator: d.creator?.name || '', creatorType: d.creator?.type || '', genre: d.genre || '',
      playing: d.playing || 0, visits: d.visits || 0, favorites: d.favoritedCount || 0, maxPlayers: d.maxPlayers || 0,
      upVotes: v.upVotes || 0, downVotes: v.downVotes || 0, created: d.created, updated: d.updated,
      icon: icons.data.find(x => x.targetId === d.id)?.imageUrl || '',
      thumbnails: (thumbs.data.find(x => x.universeId === d.id)?.thumbnails || []).filter(t => t.state === 'Completed').map(t => t.imageUrl)
    });
  }
}
// Optional: Roblox Open Cloud key (GitHub secret ROBLOX_API_KEY) adds platforms, age rating and social links.
const KEY = process.env.ROBLOX_API_KEY;
if (KEY) {
  for (const g of games) {
    try {
      const r = await fetch(`https://apis.roblox.com/cloud/v2/universes/${g.universeId}`, { headers: { 'x-api-key': KEY } });
      if (!r.ok) { console.warn('open cloud', g.universeId, r.status); continue; }
      const u = await r.json();
      g.platforms = ['desktop', 'mobile', 'tablet', 'console', 'vr'].filter(k => u[k + 'Enabled']);
      g.ageRating = u.ageRating || '';
      g.visibility = u.visibility || '';
      const link = k => u[k]?.uri || '';
      g.links = { discord: link('discordSocialLink'), group: link('robloxGroupSocialLink'), youtube: link('youtubeSocialLink'), twitter: link('twitterSocialLink') };
    } catch (e) { console.warn('open cloud', g.universeId, e.message); }
  }
  console.log('Open Cloud details added');
}

games.sort((a, b) => b.visits - a.visits);
await writeFile('data/games.json', JSON.stringify({ updated: new Date().toISOString(), games }, null, 2) + '\n');
console.log(`Wrote ${games.length} games`);
