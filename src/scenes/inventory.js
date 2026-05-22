import { getCharacter, saveCharacter } from "../storage.js";
import { getMonsterType, getMonsterStats } from "../data.js";

export default function inventoryScene(k) {
  k.scene("inventory", ({ characterId }) => {
    const character = getCharacter(characterId);
    if (!character) {
      k.go("characterSelect");
      return;
    }

    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(12, 12, 22),
    ]);

    k.add([
      k.text("Inventory", { size: 38, font: "gameFont" }),
      k.pos(k.width() / 2, 40),
      k.anchor("center"),
      k.color(255, 255, 255),
    ]);

    // Active team section
    k.add([
      k.text("Active Team", { size: 22, font: "gameFont" }),
      k.pos(k.width() / 4, 100),
      k.anchor("center"),
      k.color(100, 200, 140),
    ]);

    const active = character.activeMonsters || [];
    active.forEach((mon, i) => {
      renderMonsterSlot(k, mon, k.width() / 4 - 140, 140 + i * 90, i, "active");
    });

    // Vault section
    k.add([
      k.text("Vault", { size: 22, font: "gameFont" }),
      k.pos((k.width() * 3) / 4, 100),
      k.anchor("center"),
      k.color(100, 140, 200),
    ]);

    const vault = character.vaultMonsters || [];
    vault.forEach((mon, i) => {
      renderMonsterSlot(k, mon, (k.width() * 3) / 4 - 140, 140 + i * 90, i, "vault");
    });

    if (vault.length === 0) {
      k.add([
        k.text("Vault is empty", { size: 16, font: "gameFont" }),
        k.pos((k.width() * 3) / 4, 180),
        k.anchor("center"),
        k.color(100, 100, 120),
      ]);
    }

    // Back button
    const backBtn = k.add([
      k.text("< Back", { size: 20, font: "gameFont" }),
      k.pos(30, 30),
      k.anchor("topleft"),
      k.color(180, 180, 180),
      k.area(),
    ]);

    backBtn.onClick(() => {
      k.go("lobby", { characterId });
    });
  });
}

function renderMonsterSlot(k, mon, x, y, index, section) {
  const monType = getMonsterType(mon.typeName);
  const stats = monType ? getMonsterStats(monType, mon.level) : null;

  k.add([
    k.rect(280, 80, { radius: 8 }),
    k.pos(x, y),
    k.color(30, 30, 50),
    k.outline(1, k.Color.fromHex("#444444")),
  ]);

  const spriteName = mon.typeName.toLowerCase().replace(/\s+/g, "_");
  try {
    k.add([
      k.sprite(spriteName),
      k.pos(x + 40, y + 40),
      k.anchor("center"),
      k.scale(0.3),
    ]);
  } catch {
    k.add([
      k.rect(48, 48, { radius: 4 }),
      k.pos(x + 16, y + 16),
      k.color(50, 50, 70),
    ]);
  }

  k.add([
    k.text(mon.name, { size: 16, font: "gameFont" }),
    k.pos(x + 75, y + 14),
    k.color(220, 220, 230),
  ]);

  const element = monType ? monType.element : "?";
  k.add([
    k.text(`Lv.${mon.level}  ${element}`, { size: 13, font: "gameFont" }),
    k.pos(x + 75, y + 38),
    k.color(150, 150, 170),
  ]);

  if (stats) {
    k.add([
      k.text(`HP:${stats.health} STR:${stats.strength} DEF:${stats.defense}`, {
        size: 11,
        font: "gameFont",
      }),
      k.pos(x + 75, y + 58),
      k.color(120, 120, 140),
    ]);
  }
}
