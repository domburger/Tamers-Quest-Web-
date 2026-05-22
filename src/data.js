let monsterTypes = [];
let attacks = [];
let groundTiles = [];
let items = [];

export async function loadGameData() {
  const [monsterRes, attackRes, tileRes, itemRes] = await Promise.all([
    fetch("/assets/data/monstertype.json"),
    fetch("/assets/data/attacks.json"),
    fetch("/assets/data/groundtiles.json"),
    fetch("/assets/data/item.json"),
  ]);

  monsterTypes = await monsterRes.json();
  attacks = await attackRes.json();
  groundTiles = await tileRes.json();
  items = await itemRes.json();
}

export function getMonsterTypes() {
  return monsterTypes;
}

export function getMonsterType(name) {
  return monsterTypes.find((m) => m.typeName === name);
}

export function getAttack(name) {
  return attacks.find((a) => a.name === name);
}

export function getAttacksForMonster(monsterType) {
  return [
    monsterType.attack_1,
    monsterType.attack_2,
    monsterType.attack_3,
    monsterType.attack_4,
  ]
    .filter(Boolean)
    .map(getAttack)
    .filter(Boolean);
}

export function getGroundTiles() {
  return groundTiles;
}

export function getItems() {
  return items;
}

export function calcStat(base, scaling1, scaling2, level) {
  return Math.floor(base + scaling1 * Math.pow(level, scaling2));
}

export function getMonsterStats(monsterType, level) {
  return {
    health: calcStat(monsterType.baseHealth, monsterType.healthScaling1, monsterType.healthScaling2, level),
    strength: calcStat(monsterType.baseStrength, monsterType.strengthScaling1, monsterType.strengthScaling2, level),
    defense: calcStat(monsterType.baseDefense, monsterType.defenseScaling1, monsterType.defenseScaling2, level),
    speed: calcStat(monsterType.baseSpeed, monsterType.speedScaling1, monsterType.speedScaling2, level),
    power: calcStat(monsterType.basePower, monsterType.powerScaling1, monsterType.powerScaling2, level),
    energy: calcStat(monsterType.baseEnergy, monsterType.energyScaling1, monsterType.energyScaling2, level),
    luck: calcStat(monsterType.baseLuck, monsterType.luckScaling1, monsterType.luckScaling2, level),
  };
}
