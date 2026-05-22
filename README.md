# Tamers Quest Web

A 2D top-down dungeon crawler + monster taming RPG, built with [Kaboom.js](https://kaboomjs.com/).

Ported from the original Java/LibGDX version.

## Quick Start

```bash
npm install
npm run dev
```

## What Is Tamers Quest?

A procedurally generated dungeon crawler with monster taming and AI-mediated turn-based combat.

- **103 unique monsters** across 6 elements (Fire, Water, Nature, Dark, Light, Neutral)
- **Procedural dungeons** — 400x400 tile maps with Perlin noise, 10 random biomes per run
- **AI-mediated turn-based combat** — turns evaluated by GPT-4o (damage, accuracy, crits, elemental matchups, status effects)
- **Taming mechanic** — catch weakened monsters to grow your roster (team of 4)
- **Time pressure** — 10-minute runs, shrinking safe zone, portals spawn after 5 minutes
- **438 ground tiles**, hand-crafted monster sprites, atmospheric backgrounds

## Implementation Plan

### Phase 1: Project Scaffolding
- Set up the web project: `index.html`, Kaboom.js, dev server (Vite)
- Copy assets from the original project (sprites, fonts, backgrounds)
- Export SQLite database tables to JSON files (monsters, attacks, biomes, tiles, items)
- Set up asset loading pipeline in Kaboom

### Phase 2: Core Screens & Navigation
- **Start Screen** — logo, "press any key", fade transition
- **Character Selection** — create/select/delete characters (localStorage persistence)
- **Lobby** — hub with buttons for Inventory, Settings, Start Run
- Scene manager using Kaboom's `scene()` / `go()` system

### Phase 3: Dungeon Generation & Exploration
- Port Perlin noise map generation to JS (simplex-noise library)
- 3-stage pipeline: void map → biome assignment → floor tile placement with adjacency scoring
- Top-down player movement (WASD) with tile collision
- Camera following player, distance culling (only render nearby tiles)
- Monster spawning on tiles (0.5% rate)

### Phase 4: Combat System
- Turn-based battle screen with monster sprites, HP/energy bars, status indicators
- Player actions: Fight (pick attack), Catch, Swap, Skip, Flee
- API integration for combat resolution (OpenAI or any LLM)
- Damage formulas, elemental matchups, status effects, energy costs
- Monster fainting, swapping, defeat/victory conditions

### Phase 5: Taming & Inventory
- Catch mechanic during battle
- Inventory screen: active team (4 slots) + vault (100 slots)
- Drag-and-drop or click-to-swap between active/vault
- Monster stat display, level-up system (100 XP per level)

### Phase 6: Run Mechanics
- 10-minute timer with color-coded HUD
- Shrinking circle (after 5 min) pushing player toward center
- Portal spawning every 30s after 5 min
- Victory (portal escape) / defeat (all monsters faint) outcomes
- Minimap showing walkable area, player position, portals, circle

### Phase 7: Persistence & Polish
- Save/load via localStorage or IndexedDB (characters, monsters, inventories)
- Settings (minimap size, audio if added later)
- Defeat penalty: lose team, get 4 random starters
- UI polish, transitions, mobile-responsive layout
