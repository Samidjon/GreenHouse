import Phaser from 'phaser';

/** Emit particles anywhere inside a rectangle. Resizing the rectangle later resizes the zone. */
export function randomZone(rect: Phaser.Geom.Rectangle): Phaser.Types.GameObjects.Particles.EmitZoneData {
  return { type: 'random', source: rect as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource };
}
