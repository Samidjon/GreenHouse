/** Draw order, back to front. */
export const DEPTH = {
  sky: 0,
  sun: 1,
  clouds: 2,
  hills: 3,
  rainOutside: 4,
  building: 10,
  beams: 12,
  equipmentBack: 14,
  decorBack: 16,
  tank: 18,
  plants: 20,
  decorFront: 30,
  butterflies: 34,
  particles: 36,
  equipmentFront: 38,
  rainOnGlass: 40,
  nightOverlay: 50,
  lights: 52,
  fireflies: 54,
  floatingText: 60,
  ghost: 70,
} as const;

/** Sprites are rasterised larger than shown so they stay crisp when the camera zooms in. */
export const SPRITE_RASTER_SCALE = 1.5;
export const MAX_TEXTURE_WIDTH = 4096;

export const POT_SOIL_OFFSET = 64;
export const TAP_SLOP_PX = 10;

export const levelBackgroundKey = (level: number) => `world/bg${level}`;
