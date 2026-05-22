export default function fightScene(k) {
  k.scene("fight", ({ characterId, monster, mapData, playerPos, elapsed, portals }) => {
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(12, 8, 20),
    ]);

    k.add([
      k.text("Wild Encounter!", { size: 36, font: "gameFont" }),
      k.pos(k.width() / 2, 60),
      k.anchor("center"),
      k.color(255, 100, 100),
    ]);

    // Enemy monster
    const spriteName = monster.typeName.toLowerCase().replace(/\s+/g, "_");
    try {
      k.add([
        k.sprite(spriteName),
        k.pos(k.width() / 2, k.height() / 2 - 40),
        k.anchor("center"),
        k.scale(1.5),
      ]);
    } catch {}

    k.add([
      k.text(`${monster.name}  Lv.${monster.level}`, { size: 24, font: "gameFont" }),
      k.pos(k.width() / 2, k.height() / 2 + 80),
      k.anchor("center"),
      k.color(220, 220, 240),
    ]);

    k.add([
      k.text("(Combat coming in Phase 4)", { size: 14, font: "gameFont" }),
      k.pos(k.width() / 2, k.height() / 2 + 120),
      k.anchor("center"),
      k.color(100, 100, 120),
    ]);

    // Flee button
    const fleeBtn = k.add([
      k.rect(160, 44, { radius: 8 }),
      k.pos(k.width() / 2, k.height() - 80),
      k.anchor("center"),
      k.color(120, 50, 50),
      k.area(),
    ]);

    k.add([
      k.text("Flee", { size: 20, font: "gameFont" }),
      k.pos(k.width() / 2, k.height() - 80),
      k.anchor("center"),
      k.color(255, 200, 200),
    ]);

    fleeBtn.onClick(() => {
      k.go("game", { characterId, mapData, resumePos: playerPos, resumeElapsed: elapsed, resumePortals: portals });
    });

    k.onKeyPress("escape", () => {
      k.go("game", { characterId, mapData, resumePos: playerPos, resumeElapsed: elapsed, resumePortals: portals });
    });
  });
}
