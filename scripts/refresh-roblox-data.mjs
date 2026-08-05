import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const universeId = 2233937689;
const groupId = 34562627;

async function getJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'StuartGamesWebsite/1.0' } });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.json();
}

async function saveRemoteFile(url, path) {
  const response = await fetch(url, { headers: { 'User-Agent': 'StuartGamesWebsite/1.0' } });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  const destination = join(root, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

const [gameResult, voteResult, group, gameIconResult, groupIconResult, screenshotsResult] = await Promise.all([
  getJson(`https://games.roblox.com/v1/games?universeIds=${universeId}`),
  getJson(`https://games.roblox.com/v1/games/votes?universeIds=${universeId}`),
  getJson(`https://groups.roblox.com/v1/groups/${groupId}`),
  getJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`),
  getJson(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`),
  getJson(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=10&defaults=true&size=768x432&format=Png&isCircular=false`)
]);

const game = gameResult.data[0];
const votes = voteResult.data[0];
if (!game || !votes) throw new Error('Roblox returned incomplete game data');

const snapshot = {
  refreshedAt: new Date().toISOString(),
  game: {
    universeId: game.id,
    placeId: game.rootPlaceId,
    name: game.name,
    playing: game.playing,
    visits: game.visits,
    favorites: game.favoritedCount,
    upVotes: votes.upVotes,
    downVotes: votes.downVotes,
    updated: game.updated
  },
  group: {
    id: group.id,
    name: group.name,
    members: group.memberCount,
    verified: group.hasVerifiedBadge
  }
};

await mkdir(join(root, 'data'), { recursive: true });
await writeFile(join(root, 'data/roblox.json'), `${JSON.stringify(snapshot, null, 2)}\n`);

const downloads = [];
const gameIcon = gameIconResult.data?.[0];
const groupIcon = groupIconResult.data?.[0];
if (gameIcon?.state === 'Completed') downloads.push(saveRemoteFile(gameIcon.imageUrl, 'assets/icons/water-physics.png'));
if (groupIcon?.state === 'Completed') downloads.push(saveRemoteFile(groupIcon.imageUrl, 'assets/icons/stuart-games.png'));

const screenshots = screenshotsResult.data?.[0]?.thumbnails ?? [];
screenshots.slice(0, 10).forEach((screenshot, index) => {
  if (screenshot.state !== 'Completed') return;
  const filename = `${String(index + 1).padStart(2, '0')}.png`;
  downloads.push(saveRemoteFile(screenshot.imageUrl, `assets/screens/${filename}`));
});

await Promise.all(downloads);
console.log(`Refreshed Water Physics data and ${downloads.length} images.`);
