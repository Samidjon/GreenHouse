# Greenhouse

A cozy 2D browser gardening game. Bring a neglected glasshouse back to life, one seedling at a time. No timers to beat, nothing that can die.

Built with Next.js, React, TypeScript, Phaser 3, Zustand, Dexie (IndexedDB) and the Web Audio API.

## Setup

Requires Node 20.9+ to run. Regenerating the art (`npm run assets`) needs Node 23.6+.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build`, `npm start` | Production build and server |
| `npm run typecheck` | TypeScript checks |
| `npm test` | Unit tests for gameplay, saves and assets |
| `npm run verify` | All of the above checks, then a production build |
| `npm run assets` | Repaint the generated art into `public/assets` |

It deploys to Vercel with no configuration.

## How to play

Plant a seed, water it, wait (with the tab open or closed), harvest it, and sell the harvest. Spend the coins on seeds, pots, equipment, decorations, upgrades and, eventually, a much larger greenhouse.

### Controls

Mouse and touch work the same way, and nothing depends on hovering.

- **Tap a plant:** harvest it if it's ready, otherwise see its details.
- **Tap an empty pot:** choose a seed.
- **Tap the work table:** shop. **Tap the door:** market. **Tap the tank:** water level.
- **Drag empty space, or scroll:** look along the greenhouse.
- **Decorate tool:** drag a decoration to move it. A valid drop saves; an invalid one stays up, with a reason, until you adjust or cancel it.

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `I` | Inventory | `1`–`5` | Hand, water, plant, feed, trowel |
| `S` | Shop | `D` | Decorate |
| `E` | Encyclopedia | `←` `→` | Look along the greenhouse |
| `A` | Achievements | `Ctrl+S` | Save now |
| `U` | Upgrades | `Esc` | Close, or return to the hand |
| `X` | Expansion | `O` | Settings |

### The rules, plainly

Every multiplier below is also listed live on each plant's details card.

| Condition | Effect on growth |
| --- | --- |
| Thirsty (soil under 30%) | −30% |
| Dry (soil under 12%) | −65%, and health slowly falls |
| Light below what the plant likes | −15% |
| Temperature outside its range | −15% |
| Health under 50% | −25%, and one fewer item at harvest |
| Sunny weather | +5% |
| Fertilizer | +25% to +100% while it lasts |
| Rich Potting Mix | +5% per level |
| Coziness from decorations | Up to +15% |

Weather can only nudge things. Rain slows soil drying by 40% and refills the tank faster; sun dries soil 10% faster. Health stops at 10%: plants wilt, they never die, and any plant recovers with water or Revival Tonic. A plant that's ready to harvest simply waits.

## Architecture

```
src/
  app/          Next.js entry: layout, page, global styles
  types/        Shared domain types (imports nothing)
  data/         Catalog: plants, items, upgrades, expansions, world layout, tuning
  assets/       Typed access to the asset manifest
  systems/      Pure gameplay rules. No React, no Phaser, no storage. Fully unit tested
  persistence/  Dexie database, validation, migrations, SaveService
  audio/        AudioService and synthesised voices
  services/     Runtime loop (ticks, autosave, tab handling) and the world event bus
  stores/       Zustand stores, plus commands: what a tap means with each tool
  game/         Phaser: scenes, world objects, atmosphere, camera, input
  components/   React: menu, HUD, panels
scripts/        Art generator
docs/           Asset requirements and roadmap
```

Dependencies only point one way: `types` ← `data` ← `systems` ← `persistence`, `stores` ← `game`, `components`.

**Phaser and React stay apart.** `PhaserHost` mounts one game into an empty div, importing Phaser only inside an effect, so it never runs on the server and strict-mode double mounting can't leave two games running. The scene subscribes to the stores and draws what they say; it reports taps to `stores/commands.ts` and holds no game rules.

**Growth comes from timestamps.** The save records `simulatedUntil`. Every catch-up, whether from the one-second tick or after a week away, runs the same `simulate()` in fixed 5-second steps aligned to absolute time. That's why one long jump and thousands of small ticks produce identical results, and a test enforces it. Weather and time of day are pure functions of the clock and world seed; the game's time of day is the real local time on the player's device. The interval never advances growth by itself; it only asks the simulation to catch up.

**Offline time** is capped at 24 hours (`CONFIG.sim.maxOfflineSec`). A clock that moved backwards grants nothing and just re-anchors.

**All currency and item changes** go through `EconomyService.transact`, which validates everything and then applies everything, or nothing. Balances can't go negative. A harvest removes the plant in the same state change that pays out, so it can't pay twice.

### Saves

Saves live in IndexedDB as a checksummed JSON string with a version number.

- **Autosave:** every 20 seconds, shortly after each action, and when the tab is hidden. A synchronous copy goes to `localStorage` on tab close, because an IndexedDB write may not finish in time.
- **Backups:** a rolling set of 5, plus copies from before any migration, import or new game. Those special copies are never pruned.
- **Loading:** always takes the newest valid copy. Damaged data is kept, never deleted. A save from a newer build of the game is left untouched and blocks writing over it.
- **Validation:** every load and import goes through `validateSave`. Structural damage is rejected; bad values are repaired, so a hand-edited file can't grant negative prices or impossible states. It doesn't stop someone editing their own coin balance to a large number, which is a single-player game's prerogative.
- **Two tabs:** the most recently opened tab owns the save, and the other stops writing and says so.

To change the save format, bump `CONFIG.save.version` and add a step in `persistence/migrations.ts`.

### Adding content

- **A plant:** add a row in `data/plants.ts` and a painter in `scripts/art/species.mjs`, then run `npm run assets`. The art test fails if any stage is missing. Add it to the last collection milestone's count too; a test checks this.
- **A decoration, pot or upgrade:** add it in `data/catalog.ts`. Anything with a sprite needs matching art in `scripts/art/props.mjs`.
- **A greenhouse position:** add it to `data/worldLayout.json`.

See [docs/ASSETS.md](docs/ASSETS.md) for art requirements and [docs/ROADMAP.md](docs/ROADMAP.md) for what's next.
