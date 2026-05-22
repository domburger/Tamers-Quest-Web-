import { findSpawnPoint } from "../systems/mapgen.js";
import { getCharacter } from "../storage.js";

const TILE_SIZE = 128;
const TILE_OVERLAP = 48;
const EFFECTIVE_TILE = TILE_SIZE - TILE_OVERLAP; // 80
const RENDER_DISTANCE = 20;
const BASE_SPEED = 200;
const RUN_DURATION = 600; // 10 minutes
const CIRCLE_START_TIME = 300; // 5 minutes
const PORTAL_INTERVAL = 30;

export default function gameScene(k) {
  k.scene("game", ({ characterId, mapData, resumePos, resumeElapsed, resumePortals }) => {
    const character = getCharacter(characterId);
    if (!character) { k.go("characterSelect"); return; }

    const { voidMap, tileMap, mapSize } = mapData;

    // Player state — resume or fresh spawn
    let playerX, playerY;
    if (resumePos) {
      playerX = resumePos.x;
      playerY = resumePos.y;
    } else {
      const spawn = findSpawnPoint(voidMap);
      playerX = spawn.x * EFFECTIVE_TILE;
      playerY = spawn.y * EFFECTIVE_TILE;
    }

    // Timer state
    let elapsed = resumeElapsed || 0;
    let portals = resumePortals || [];
    let circleRadius = mapSize * EFFECTIVE_TILE;
    const circleCenterX = (mapSize / 2) * EFFECTIVE_TILE;
    const circleCenterY = (mapSize / 2) * EFFECTIVE_TILE;

    // Precompute walkable tile sprite names
    const loadedTileSprites = new Set();

    // Tile sprite loading - load unique tile images used in the map
    const neededSprites = new Set();
    for (let x = 0; x < mapSize; x++) {
      for (let y = 0; y < mapSize; y++) {
        const t = tileMap[x][y];
        if (t && t.imagePath) neededSprites.add(t.imagePath);
      }
    }
    for (const img of neededSprites) {
      const name = "tile_" + img.replace(".png", "");
      if (!loadedTileSprites.has(name)) {
        try {
          k.loadSprite(name, `/assets/textures/tiles/ground/${img}`);
          loadedTileSprites.add(name);
        } catch {}
      }
    }

    // Camera
    k.camPos(playerX, playerY);

    // Main update loop
    k.onUpdate(() => {
      elapsed += k.dt();
      handleMovement();
      k.camPos(playerX, playerY);
      updateCircle();
      checkPortalCollision();
      checkMonsterEncounter();
    });

    // HUD elements (fixed to screen)
    const timerLabel = k.add([
      k.text("10:00", { size: 32, font: "gameFont" }),
      k.pos(k.width() / 2, 30),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.fixed(),
      k.z(100),
    ]);

    const portalHint = k.add([
      k.text("", { size: 16, font: "gameFont" }),
      k.pos(k.width() / 2, 60),
      k.anchor("center"),
      k.color(80, 220, 255),
      k.fixed(),
      k.z(100),
    ]);

    // Update HUD in the update loop
    k.onUpdate(() => {
      const remaining = Math.max(0, RUN_DURATION - elapsed);
      const minutes = Math.floor(remaining / 60);
      const seconds = Math.floor(remaining % 60);
      timerLabel.text = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      if (remaining < 60) timerLabel.color = k.rgb(255, 60, 60);
      else if (remaining < 180) timerLabel.color = k.rgb(255, 255, 60);
      else timerLabel.color = k.rgb(255, 255, 255);

      if (elapsed >= CIRCLE_START_TIME && portals.length > 0) {
        portalHint.text = "Portals available! Step on one to escape.";
      } else {
        portalHint.text = "";
      }
    });

    // Rendering
    k.onDraw(() => {
      drawTiles();
      drawPlayer();
      drawPortals();
      drawCircleOverlay();
      drawMinimap();
    });

    function handleMovement() {
      let dx = 0, dy = 0;
      if (k.isKeyDown("w") || k.isKeyDown("up")) dy = -1;
      if (k.isKeyDown("s") || k.isKeyDown("down")) dy = 1;
      if (k.isKeyDown("a") || k.isKeyDown("left")) dx = -1;
      if (k.isKeyDown("d") || k.isKeyDown("right")) dx = 1;

      if (dx === 0 && dy === 0) return;

      // Normalize diagonal
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      const tile = getTileAt(playerX, playerY);
      const speedMod = tile?.speedModifier || 1.0;
      const speed = BASE_SPEED * speedMod * k.dt();

      const newX = playerX + dx * speed;
      const newY = playerY + dy * speed;

      // Check collision for X movement
      if (isWalkable(newX, playerY)) {
        playerX = newX;
      }
      // Check collision for Y movement
      if (isWalkable(playerX, newY)) {
        playerY = newY;
      }
    }

    function getTileAt(px, py) {
      const tx = Math.floor(px / EFFECTIVE_TILE);
      const ty = Math.floor(py / EFFECTIVE_TILE);
      if (tx < 0 || tx >= mapSize || ty < 0 || ty >= mapSize) return null;
      return tileMap[tx][ty];
    }

    function isWalkable(px, py) {
      // Check two points (left edge and center) for collision
      const tx1 = Math.floor(px / EFFECTIVE_TILE);
      const ty1 = Math.floor(py / EFFECTIVE_TILE);
      if (tx1 < 0 || tx1 >= mapSize || ty1 < 0 || ty1 >= mapSize) return false;
      if (!voidMap[tx1][ty1]) return false;
      const tile = tileMap[tx1][ty1];
      if (tile && tile.collidable) return false;
      return true;
    }

    function drawTiles() {
      const camX = playerX;
      const camY = playerY;
      const halfW = k.width() / 2;
      const halfH = k.height() / 2;

      const startX = Math.max(0, Math.floor((camX - halfW) / EFFECTIVE_TILE) - 1);
      const endX = Math.min(mapSize - 1, Math.ceil((camX + halfW) / EFFECTIVE_TILE) + 1);
      const startY = Math.max(0, Math.floor((camY - halfH) / EFFECTIVE_TILE) - 1);
      const endY = Math.min(mapSize - 1, Math.ceil((camY + halfH) / EFFECTIVE_TILE) + 1);

      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          const tile = tileMap[x][y];
          if (!tile) continue;

          // Distance culling
          const ptx = Math.floor(playerX / EFFECTIVE_TILE);
          const pty = Math.floor(playerY / EFFECTIVE_TILE);
          const dist = Math.abs(x - ptx) + Math.abs(y - pty);
          if (dist > RENDER_DISTANCE) continue;

          const centerX = x * EFFECTIVE_TILE + EFFECTIVE_TILE / 2;
          const centerY = y * EFFECTIVE_TILE + EFFECTIVE_TILE / 2;
          const spriteName = "tile_" + tile.imagePath.replace(".png", "");

          if (loadedTileSprites.has(spriteName)) {
            k.drawSprite({
              sprite: spriteName,
              pos: k.vec2(centerX, centerY),
              width: TILE_SIZE,
              height: TILE_SIZE,
              angle: tile.rotation || 0,
              anchor: "center",
            });
          } else {
            k.drawRect({
              pos: k.vec2(centerX, centerY),
              width: EFFECTIVE_TILE,
              height: EFFECTIVE_TILE,
              color: k.rgb(40, 60, 40),
              anchor: "center",
            });
          }

          // Monster indicator
          if (tile.activeMonster) {
            k.drawCircle({
              pos: k.vec2(centerX, centerY),
              radius: 6,
              color: k.rgb(255, 60, 60),
            });
          }
        }
      }
    }

    function drawPlayer() {
      k.drawSprite({
        sprite: "player",
        pos: k.vec2(playerX, playerY - 16),
        anchor: "center",
        scale: 1,
      });
    }

    function drawPortals() {
      for (const portal of portals) {
        const px = portal.x * EFFECTIVE_TILE + EFFECTIVE_TILE / 2;
        const py = portal.y * EFFECTIVE_TILE + EFFECTIVE_TILE / 2;

        // Pulsating glow
        const pulse = 0.6 + 0.4 * Math.sin(elapsed * 4);
        k.drawCircle({
          pos: k.vec2(px, py),
          radius: 20 * pulse,
          color: k.rgb(0, 200, 255),
          opacity: 0.3,
        });
        k.drawCircle({
          pos: k.vec2(px, py),
          radius: 10,
          color: k.rgb(80, 220, 255),
          opacity: 0.8,
        });
      }
    }

    function updateCircle() {
      if (elapsed < CIRCLE_START_TIME) return;

      const remaining = RUN_DURATION - elapsed;
      const circleTime = RUN_DURATION - CIRCLE_START_TIME;
      const ratio = Math.max(0, remaining / circleTime);
      circleRadius = ratio * (mapSize / 2) * EFFECTIVE_TILE;

      // Spawn portal periodically
      const portalCount = Math.floor((elapsed - CIRCLE_START_TIME) / PORTAL_INTERVAL);
      while (portals.length < portalCount + 1) {
        spawnPortal();
      }
    }

    function spawnPortal() {
      for (let attempt = 0; attempt < 100; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * circleRadius * 0.8;
        const px = Math.floor((circleCenterX + Math.cos(angle) * dist) / EFFECTIVE_TILE);
        const py = Math.floor((circleCenterY + Math.sin(angle) * dist) / EFFECTIVE_TILE);
        if (px >= 0 && px < mapSize && py >= 0 && py < mapSize && voidMap[px][py]) {
          portals.push({ x: px, y: py });
          return;
        }
      }
    }

    function checkPortalCollision() {
      const ptx = Math.floor(playerX / EFFECTIVE_TILE);
      const pty = Math.floor(playerY / EFFECTIVE_TILE);
      for (const portal of portals) {
        if (portal.x === ptx && portal.y === pty) {
          k.go("runResult", { characterId, result: "victory" });
          return;
        }
      }

      // Time's up
      if (elapsed >= RUN_DURATION) {
        k.go("runResult", { characterId, result: "timeout" });
      }
    }

    function checkMonsterEncounter() {
      const ptx = Math.floor(playerX / EFFECTIVE_TILE);
      const pty = Math.floor(playerY / EFFECTIVE_TILE);
      if (ptx < 0 || ptx >= mapSize || pty < 0 || pty >= mapSize) return;
      const tile = tileMap[ptx][pty];
      if (tile?.activeMonster) {
        const monster = tile.activeMonster;
        tile.activeMonster = null;
        k.go("fight", { characterId, monster, mapData, playerPos: { x: playerX, y: playerY }, elapsed, portals });
      }
    }

    function drawCircleOverlay() {
      if (elapsed < CIRCLE_START_TIME) return;
      // Draw red circle boundary (in world space)
      k.drawCircle({
        pos: k.vec2(circleCenterX, circleCenterY),
        radius: circleRadius,
        fill: false,
        outline: { width: 3, color: k.rgb(255, 50, 50) },
        opacity: 0.6,
      });
    }

    function drawMinimap() {
      // Convert screen-space coords to world-space for drawing
      const camX = playerX;
      const camY = playerY;
      const mmSize = 160;
      const screenRight = camX + k.width() / 2;
      const screenBottom = camY + k.height() / 2;
      const mmX = screenRight - mmSize - 16;
      const mmY = screenBottom - mmSize - 16;
      const mmScale = mmSize / mapSize;

      k.drawRect({
        pos: k.vec2(mmX, mmY),
        width: mmSize,
        height: mmSize,
        color: k.rgb(0, 0, 0),
        opacity: 0.7,
      });

      for (let x = 0; x < mapSize; x += 2) {
        for (let y = 0; y < mapSize; y += 2) {
          if (voidMap[x][y]) {
            k.drawRect({
              pos: k.vec2(mmX + x * mmScale, mmY + y * mmScale),
              width: Math.max(1, mmScale * 2),
              height: Math.max(1, mmScale * 2),
              color: k.rgb(40, 80, 40),
            });
          }
        }
      }

      for (const portal of portals) {
        k.drawCircle({
          pos: k.vec2(mmX + portal.x * mmScale, mmY + portal.y * mmScale),
          radius: 3,
          color: k.rgb(80, 180, 255),
        });
      }

      if (elapsed >= CIRCLE_START_TIME) {
        k.drawCircle({
          pos: k.vec2(mmX + (mapSize / 2) * mmScale, mmY + (mapSize / 2) * mmScale),
          radius: (circleRadius / EFFECTIVE_TILE) * mmScale,
          fill: false,
          outline: { width: 1, color: k.rgb(255, 50, 50) },
        });
      }

      const pmmX = mmX + (playerX / EFFECTIVE_TILE) * mmScale;
      const pmmY = mmY + (playerY / EFFECTIVE_TILE) * mmScale;
      k.drawCircle({
        pos: k.vec2(pmmX, pmmY),
        radius: 3,
        color: k.rgb(255, 50, 50),
      });

      k.drawRect({
        pos: k.vec2(mmX, mmY),
        width: mmSize,
        height: mmSize,
        fill: false,
        outline: { width: 1, color: k.rgb(100, 100, 100) },
      });
    }

    // Pause menu
    k.onKeyPress("escape", () => {
      k.go("lobby", { characterId });
    });
  });
}
