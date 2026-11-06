# Assets

Everything in `public/assets` is **temporary art**, painted by `scripts/generate-assets.mjs` as seeded, deterministic SVG. It is meant to be replaced by an artist without touching gameplay code.

`public/assets/manifest.json` is the single list of assets. Code only ever refers to manifest keys, never to file paths, and a test fails if a manifest entry points at a missing file or a catalog item has no art.

## Replacing an asset

1. Put the final file somewhere outside the generated folders, for example `public/assets/final/basil_mature.png`. The generator deletes `plants`, `seeds`, `pots`, `decor`, `equipment`, `items`, `ui`, `world` and `fx` before repainting them.
2. Point the key at it in `public/assets/manifest.overrides.json`:

   ```json
   {
     "plants/basil/MATURE": { "path": "/assets/final/basil_mature.png" }
   }
   ```

3. Run `npm run assets` to rebuild the manifest.

The loader picks the method from the file: `.svg` is rasterised at load time, anything else loads as an image. Add `frameWidth` and `frameHeight` to an override to load a file as a spritesheet. The loader supports that today, but the scene draws plants as single images, so playing an animation would need a small addition in `PlantSlotView`.

**Raster size:** the world draws sprites at 1/1.5 scale so they stay crisp when the camera zooms. Supply PNGs at 1.5× the sizes below, with transparent backgrounds.

## Expected files

Sizes are the on-screen size in world pixels.

| Key | Generated file | Size | Notes |
| --- | --- | --- | --- |
| `plants/<id>/<STAGE>` | `plants/<id>/<stage>.svg` | 200 × 260 | One per stage: SEED, SPROUT, SEEDLING, GROWING, MATURE, HARVESTABLE. The soil line is at (100, 250); keep that anchor or set `originX` and `originY` |
| `seeds/<id>` | `seeds/<id>.svg` | 96 × 120 | Seed packet shown in menus |
| `pots/<id>` | `pots/<id>.svg` | 120 × 96 | Base at the bottom centre, soil line 28px from the top |
| `decor/<id>` | `decor/<id>.svg` | From `data/catalog.ts` | Anchor by zone: floor is bottom centre, wall is centre, hanging is top centre |
| `equipment/<id>` | `equipment/<id>.svg` | Varies, see `EQUIP_ART` | Lamps and misting pipes tile along the roof |
| `items/<id>` | `items/<id>.svg` | 64 × 64 | Fertilizers, tools and upgrades |
| `ui/<id>` | `ui/<id>.svg` | 64 × 64 | HUD and menu icons |
| `world/bg1`–`bg5` | `world/background_<n>.svg` | 1280, 1760, 2240, 2880, 3520 × 720 | One per stage. **Panes must be translucent:** the live sky shows through them |
| `world/hills` | `world/hills.svg` | 1600 × 420 | Tiles behind the glass |
| `world/cloud1`, `cloud2` | `world/cloud*.svg` | 320 × 110 | |
| `world/tank` | `world/tank.svg` | 110 × 180 | Base at the bottom centre |
| `fx/*` | `fx/*.svg` | 32 × 32, except `glow` (256²), `beam` (256 × 720) and `butterfly*` (48 × 40) | Particles and light |

Backgrounds must keep furniture lined up with `src/data/worldLayout.json`, which holds pot positions and the door, tank and table tap zones.

## Audio

There are no audio files. Music, rain, nature sounds and effects are synthesised in `src/audio`. To use recordings, decode them in `AudioService` and play them through its existing `music`, `ambience` and `sfx` buses, so volume and mute keep working.

## Fonts

Lora and Nunito load through `next/font`, which self-hosts them at build time.
