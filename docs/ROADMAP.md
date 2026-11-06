# Roadmap

The MVP is complete: the full loop, all five greenhouse stages, 21 species, and reliable saves. These are the next things worth building, roughly in order.

## Art and sound

- Commission final plant, room and UI art to replace the generated SVGs. See [ASSETS.md](ASSETS.md).
- Recorded ambience and an original music score.
- Bake SVGs to PNG atlases at build time. Rasterising about 150 SVGs takes a noticeable moment on first load, and an atlas would remove it.
- Animated plant sprites using the spritesheet support already in the loader.

## Gameplay

- **Perennials:** plants that regrow after harvest, for tomatoes and strawberries in particular.
- **Cross-pollination:** breed two plants to discover varieties, giving mutations a deliberate path.
- **Reach 30+ species:** the catalog already scales. Add cacti, bulbs, climbers and water plants, plus species that favour the pond.
- **Commissions:** gentle, optional requests from villagers ("three lavender for the fair") with no deadlines.
- **Compost bin:** turn surplus harvest into fertilizer.
- **Seasons:** slow cosmetic changes outside the glass, with seasonal seeds and no pressure to log in.
- **Decoration:** more floor space per wing, rugs, and themed sets with small set bonuses.
- **Keepsakes:** a photo mode to save a picture of your greenhouse.

## Accessibility

- Keyboard-only play in the world. Menus are fully keyboard-accessible, but tapping pots needs a pointer today. A focusable list of positions would close the gap for keyboard and screen-reader players.
- A high-contrast UI theme and adjustable text size.

## Technical

- Browser end-to-end tests that drive a full session. Today's automated tests cover the rules, saves and asset integrity; the UI was tested by hand.
- Installable PWA with offline play.
- Optional cloud sync, using the existing export format.
- Balance pass from real play data: the late-game economy has only been checked by calculation, not by playing it start to finish.
