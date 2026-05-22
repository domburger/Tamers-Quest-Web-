export default function runResultScene(k) {
  k.scene("runResult", ({ characterId, result }) => {
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(8, 8, 16),
    ]);

    const isVictory = result === "victory";
    const title = isVictory ? "You Escaped!" : "Time's Up!";
    const subtitle = isVictory
      ? "You made it through the portal with your team intact."
      : "The dungeon collapsed. Your beasts scatter into the void.";

    k.add([
      k.text(title, { size: 48, font: "gameFont" }),
      k.pos(k.width() / 2, k.height() / 2 - 60),
      k.anchor("center"),
      k.color(isVictory ? 80 : 255, isVictory ? 220 : 80, isVictory ? 140 : 80),
    ]);

    k.add([
      k.text(subtitle, { size: 18, font: "gameFont", width: 600 }),
      k.pos(k.width() / 2, k.height() / 2 + 10),
      k.anchor("center"),
      k.color(180, 180, 200),
    ]);

    const btn = k.add([
      k.rect(200, 48, { radius: 8 }),
      k.pos(k.width() / 2, k.height() / 2 + 100),
      k.anchor("center"),
      k.color(50, 100, 80),
      k.area(),
    ]);

    k.add([
      k.text("Continue", { size: 22, font: "gameFont" }),
      k.pos(k.width() / 2, k.height() / 2 + 100),
      k.anchor("center"),
      k.color(220, 255, 220),
    ]);

    btn.onClick(() => {
      k.go("lobby", { characterId });
    });

    k.onKeyPress("enter", () => {
      k.go("lobby", { characterId });
    });
  });
}
