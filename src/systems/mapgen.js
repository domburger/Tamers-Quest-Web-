import { PerlinNoise } from "./perlinNoise.js";
import { getGroundTiles, getMonsterTypes } from "../data.js";

const MAP_SIZE = 200;
const WALKABLE_PERCENTAGE = 0.35;
const SHORT_WALK_STEPS = 500;
const MAX_DLA_STEPS = 500;
const NUM_BIOMES = 10;
const SMOOTHING_PASSES = 5;
const MONSTER_DENSITY = 0.001;
const TILE_POOL_SIZE = 500;

const BIOME_DEFS = [
  { name: "Forest", rarity: 30, size: 80 },
  { name: "Plains", rarity: 40, size: 60 },
  { name: "Desert", rarity: 40, size: 60 },
  { name: "Tundra", rarity: 50, size: 80 },
  { name: "Volcano", rarity: 70, size: 60 },
  { name: "Swamp", rarity: 40, size: 60 },
  { name: "Metal", rarity: 70, size: 60 },
  { name: "Stone", rarity: 30, size: 60 },
  { name: "Mushroom", rarity: 70, size: 40 },
  { name: "Astral", rarity: 90, size: 40 },
  { name: "Water", rarity: 90, size: 80 },
  { name: "Crystal", rarity: 60, size: 50 },
];

export async function generateMap(onProgress) {
  const voidMap = new Array(MAP_SIZE);
  const biomeMap = new Array(MAP_SIZE);
  const tileMap = new Array(MAP_SIZE);

  for (let x = 0; x < MAP_SIZE; x++) {
    voidMap[x] = new Array(MAP_SIZE).fill(false);
    biomeMap[x] = new Array(MAP_SIZE).fill(null);
    tileMap[x] = new Array(MAP_SIZE).fill(null);
  }

  onProgress?.(0.05, "Generating walkable area...");
  generateDLA(voidMap);
  await yieldFrame();

  onProgress?.(0.30, "Assigning biomes...");
  generateBiomesVoronoi(biomeMap);

  onProgress?.(0.40, "Selecting tiles...");
  const allTiles = getGroundTiles();
  const biomePools = buildBiomePools(allTiles);
  await fillMapWithTiles(voidMap, biomeMap, tileMap, biomePools, onProgress);

  onProgress?.(0.90, "Spawning monsters...");
  const monsters = spawnMonsters(voidMap, tileMap);

  onProgress?.(1.0, "Done!");

  return { voidMap, biomeMap, tileMap, monsters, mapSize: MAP_SIZE };
}

function yieldFrame() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function generateDLA(voidMap) {
  const requiredTiles = Math.floor(MAP_SIZE * MAP_SIZE * WALKABLE_PERCENTAGE);

  const startX = Math.floor(MAP_SIZE / 4 + Math.random() * (MAP_SIZE / 4));
  const startY = Math.floor(MAP_SIZE / 4 + Math.random() * (MAP_SIZE / 4));
  let x = startX;
  let y = startY;

  for (let i = 0; i < SHORT_WALK_STEPS; i++) {
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0 && x < MAP_SIZE - 1) x++;
    else if (dir === 1 && x > 0) x--;
    else if (dir === 2 && y < MAP_SIZE - 1) y++;
    else if (dir === 3 && y > 0) y--;
    voidMap[x][y] = true;
  }

  let walkableCount = countWalkable(voidMap);

  while (walkableCount < requiredTiles) {
    const sx = Math.floor(Math.random() * MAP_SIZE);
    const sy = Math.floor(Math.random() * MAP_SIZE);
    walkableCount += dlaWalk(voidMap, sx, sy);
  }

  for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
    smoothMap(voidMap);
    widenNarrowTunnels(voidMap);
  }
}

function dlaWalk(voidMap, startX, startY) {
  let x = startX, y = startY;
  for (let step = 0; step < MAX_DLA_STEPS; step++) {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return 0;

    if (hasWalkableNeighbor(voidMap, x, y)) {
      if (!voidMap[x][y]) {
        voidMap[x][y] = true;
        return 1;
      }
      return 0;
    }

    const dir = Math.floor(Math.random() * 4);
    if (dir === 0) x++;
    else if (dir === 1) x--;
    else if (dir === 2) y++;
    else y--;
  }
  return 0;
}

function hasWalkableNeighbor(voidMap, x, y) {
  if (x > 0 && voidMap[x - 1][y]) return true;
  if (x < MAP_SIZE - 1 && voidMap[x + 1][y]) return true;
  if (y > 0 && voidMap[x][y - 1]) return true;
  if (y < MAP_SIZE - 1 && voidMap[x][y + 1]) return true;
  return false;
}

function countWalkable(voidMap) {
  let count = 0;
  for (let x = 0; x < MAP_SIZE; x++)
    for (let y = 0; y < MAP_SIZE; y++)
      if (voidMap[x][y]) count++;
  return count;
}

function smoothMap(voidMap) {
  const toFill = [];
  for (let x = 1; x < MAP_SIZE - 1; x++) {
    for (let y = 1; y < MAP_SIZE - 1; y++) {
      if (voidMap[x][y]) continue;
      let neighbors = 0;
      if (voidMap[x - 1][y]) neighbors++;
      if (voidMap[x + 1][y]) neighbors++;
      if (voidMap[x][y - 1]) neighbors++;
      if (voidMap[x][y + 1]) neighbors++;
      if (voidMap[x - 1][y - 1]) neighbors++;
      if (voidMap[x + 1][y - 1]) neighbors++;
      if (voidMap[x - 1][y + 1]) neighbors++;
      if (voidMap[x + 1][y + 1]) neighbors++;
      if (neighbors > 4) toFill.push([x, y]);
    }
  }
  for (const [x, y] of toFill) voidMap[x][y] = true;
}

function widenNarrowTunnels(voidMap) {
  const toFill = [];
  for (let x = 1; x < MAP_SIZE - 1; x++) {
    for (let y = 1; y < MAP_SIZE - 1; y++) {
      if (!voidMap[x][y]) continue;
      // Horizontal tunnel: walkable left+right, void above+below
      if (voidMap[x - 1][y] && voidMap[x + 1][y] && !voidMap[x][y - 1] && !voidMap[x][y + 1]) {
        toFill.push([x, y - 1]);
        toFill.push([x, y + 1]);
      }
      // Vertical tunnel: walkable above+below, void left+right
      if (voidMap[x][y - 1] && voidMap[x][y + 1] && !voidMap[x - 1][y] && !voidMap[x + 1][y]) {
        toFill.push([x - 1, y]);
        toFill.push([x + 1, y]);
      }
    }
  }
  for (const [x, y] of toFill) {
    if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
      voidMap[x][y] = true;
    }
  }
}

function generateBiomesVoronoi(biomeMap) {
  const centers = [];
  for (let i = 0; i < NUM_BIOMES; i++) {
    centers.push({
      x: Math.floor(Math.random() * MAP_SIZE),
      y: Math.floor(Math.random() * MAP_SIZE),
      biome: BIOME_DEFS[Math.floor(Math.random() * BIOME_DEFS.length)],
    });
  }

  for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      let minDist = Infinity;
      let closest = null;
      for (const center of centers) {
        const dx = x - center.x;
        const dy = y - center.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          closest = center.biome;
        }
      }
      biomeMap[x][y] = closest;
    }
  }
}

function buildBiomePools(allTiles) {
  const pools = {};
  const all = [];
  for (const tile of allTiles) {
    const b = tile.biome || "unknown";
    if (!pools[b]) pools[b] = [];
    pools[b].push(tile);
    all.push(tile);
  }
  pools._all = all;
  return pools;
}

function getCandidateTiles(biomePools, biomeName) {
  const matched = biomePools[biomeName] || [];
  // Use all biome-matched tiles + up to 10 random from other biomes
  const others = biomePools._all;
  const extras = [];
  for (let i = 0; i < 10 && i < others.length; i++) {
    const t = others[Math.floor(Math.random() * others.length)];
    if (t.biome !== biomeName) extras.push(t);
  }
  return matched.length > 0 ? [...matched, ...extras] : others.slice(0, 30);
}

async function fillMapWithTiles(voidMap, biomeMap, tileMap, biomePools, onProgress) {
  let filled = 0;
  let total = 0;
  for (let x = 0; x < MAP_SIZE; x++)
    for (let y = 0; y < MAP_SIZE; y++)
      if (voidMap[x][y]) total++;

  for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      if (!voidMap[x][y]) continue;

      const biomeName = biomeMap[x][y]?.name || "";
      const candidates = getCandidateTiles(biomePools, biomeName);

      let bestTile = null;
      let bestScore = -Infinity;
      let bestRotation = 0;

      for (const tile of candidates) {
        for (let rot = 0; rot < 4; rot++) {
          const score = calculateTileScore(x, y, tile, rot, biomeMap, tileMap);
          if (score > bestScore) {
            bestScore = score;
            bestTile = tile;
            bestRotation = rot;
          }
        }
      }

      if (bestTile) {
        tileMap[x][y] = {
          ...bestTile,
          rotation: bestRotation * 90,
          activeMonster: null,
        };
      }

      filled++;
      if (filled % 2000 === 0) {
        onProgress?.(0.40 + 0.50 * (filled / total), "Placing tiles...");
        await yieldFrame();
      }
    }
  }
}

function calculateTileScore(x, y, tile, rotation, biomeMap, tileMap) {
  let score = 0;

  // Biome match: +50
  if (tile.biome === biomeMap[x][y]?.name) {
    score += 50;
  }

  // Color profile matching with neighbors
  score += calculateColorProfileMatch(x, y, tile, rotation, tileMap);

  // Adjacency penalty: -15 per identical neighbor
  if (x > 0 && tileMap[x - 1][y]?.name === tile.name) score -= 15;
  if (x < MAP_SIZE - 1 && tileMap[x + 1][y]?.name === tile.name) score -= 15;
  if (y > 0 && tileMap[x][y - 1]?.name === tile.name) score -= 15;
  if (y < MAP_SIZE - 1 && tileMap[x][y + 1]?.name === tile.name) score -= 15;

  // Randomness
  score += Math.random() * 16;

  return score;
}

function getRotatedProfile(tile, rotation) {
  const top = { r: tile.colorProfile_top_r, g: tile.colorProfile_top_g, b: tile.colorProfile_top_b };
  const bottom = { r: tile.colorProfile_bottom_r, g: tile.colorProfile_bottom_g, b: tile.colorProfile_bottom_b };
  const left = { r: tile.colorProfile_left_r, g: tile.colorProfile_left_g, b: tile.colorProfile_left_b };
  const right = { r: tile.colorProfile_right_r, g: tile.colorProfile_right_g, b: tile.colorProfile_right_b };
  const full = { r: tile.colorProfile_full_r, g: tile.colorProfile_full_g, b: tile.colorProfile_full_b };

  // Rotate clockwise: top->right, right->bottom, bottom->left, left->top
  const sides = [top, right, bottom, left];
  const rotIdx = rotation % 4;
  return {
    top: sides[(4 - rotIdx) % 4],
    right: sides[(5 - rotIdx) % 4],
    bottom: sides[(6 - rotIdx) % 4],
    left: sides[(7 - rotIdx) % 4],
    full,
  };
}

function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function calculateColorProfileMatch(x, y, tile, rotation, tileMap) {
  const profile = getRotatedProfile(tile, rotation);
  let score = 0;

  const neighbors = [
    { dx: -1, dy: 0, mySide: "left", theirSide: "right" },
    { dx: 1, dy: 0, mySide: "right", theirSide: "left" },
    { dx: 0, dy: -1, mySide: "bottom", theirSide: "top" },
    { dx: 0, dy: 1, mySide: "top", theirSide: "bottom" },
  ];

  for (const n of neighbors) {
    const nx = x + n.dx;
    const ny = y + n.dy;
    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
    const neighbor = tileMap[nx][ny];
    if (!neighbor) continue;

    const neighborProfile = getRotatedProfile(neighbor, (neighbor.rotation || 0) / 90);

    // Side profile: 0-50 points
    const sideDist = colorDistance(profile[n.mySide], neighborProfile[n.theirSide]);
    score += 50 - (sideDist / 255) * 50;

    // Full profile: 0-30 points
    const fullDist = colorDistance(profile.full, neighborProfile.full);
    score += 30 - (fullDist / 255) * 30;
  }

  return score;
}

function spawnMonsters(voidMap, tileMap) {
  const maxMonsters = Math.floor(MAP_SIZE * MAP_SIZE * MONSTER_DENSITY);
  const allMonsterTypes = getMonsterTypes();
  const monsters = [];

  let attempts = 0;
  while (monsters.length < maxMonsters && attempts < maxMonsters * 10) {
    attempts++;
    const x = Math.floor(Math.random() * MAP_SIZE);
    const y = Math.floor(Math.random() * MAP_SIZE);
    if (!voidMap[x][y] || !tileMap[x][y]) continue;
    if (tileMap[x][y].activeMonster) continue;

    const monType = allMonsterTypes[Math.floor(Math.random() * allMonsterTypes.length)];
    const level = 1 + Math.floor(Math.random() * 5);
    const monster = {
      id: Date.now() + monsters.length,
      typeName: monType.typeName,
      name: monType.typeName,
      level,
      xp: 0,
      currentHealth: monType.baseHealth,
      currentEnergy: monType.baseEnergy,
      status: null,
      tileX: x,
      tileY: y,
    };

    tileMap[x][y].activeMonster = monster;
    monsters.push(monster);
  }

  return monsters;
}

export function findSpawnPoint(voidMap) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const x = Math.floor(Math.random() * (MAP_SIZE - 2)) + 1;
    const y = Math.floor(Math.random() * (MAP_SIZE - 2)) + 1;

    let allWalkable = true;
    for (let dx = -1; dx <= 1 && allWalkable; dx++) {
      for (let dy = -1; dy <= 1 && allWalkable; dy++) {
        if (!voidMap[x + dx][y + dy]) allWalkable = false;
      }
    }
    if (allWalkable) return { x, y };
  }
  // Fallback: find any walkable tile
  for (let x = 1; x < MAP_SIZE - 1; x++)
    for (let y = 1; y < MAP_SIZE - 1; y++)
      if (voidMap[x][y]) return { x, y };
  return { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
}

export { MAP_SIZE };
