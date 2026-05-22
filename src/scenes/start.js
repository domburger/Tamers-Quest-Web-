export default function startScene(k) {
  k.scene("start", () => {
    const bg = k.add([
      k.sprite("title_background"),
      k.pos(k.width() / 2, k.height() / 2),
      k.anchor("center"),
      k.scale(Math.max(k.width() / 1920, k.height() / 1080) * 1.1),
    ]);

    const logo = k.add([
      k.sprite("logo"),
      k.pos(k.width() / 2, k.height() * 0.35),
      k.anchor("center"),
      k.scale(0.6),
    ]);

    const prompt = k.add([
      k.text("Press any key to start", { size: 28, font: "gameFont" }),
      k.pos(k.width() / 2, k.height() * 0.72),
      k.anchor("center"),
      k.color(220, 220, 220),
      k.opacity(1),
    ]);

    let elapsed = 0;
    prompt.onUpdate(() => {
      elapsed += k.dt();
      prompt.opacity = 0.4 + 0.6 * Math.abs(Math.sin(elapsed * 2));
    });

    const versionLabel = k.add([
      k.text("v1.0.0", { size: 16, font: "gameFont" }),
      k.pos(k.width() - 16, k.height() - 16),
      k.anchor("botright"),
      k.color(120, 120, 120),
    ]);

    k.onKeyPress(() => {
      k.go("characterSelect");
    });

    k.onMousePress(() => {
      k.go("characterSelect");
    });
  });
}
