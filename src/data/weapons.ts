import { Graphics } from "pixi.js";

export interface Weapon {
  /** Displayed name */
  readonly name: string;
  /** Asset URL for weapon icon */
  readonly iconUrl?: string;
  /** Rate of fire in rpm */
  readonly rof: number;
  /** Damage on hit */
  readonly damage: number;
  /** Damage type on hit */
  readonly damageType: "kinetic" | "energy" | "explosive";
  /** Projectile sped (if applicable) */
  readonly projectileSpeed?: number;
  /** Given a Graphis object, draws the projectile */
  readonly drawProjectile: (g: Graphics) => Graphics;
}

export const WEAPONS: { [k: string]: Weapon } = {
  cannon: {
    name: "TI-4-G Mounted Autocannon",
    rof: 360,
    damage: 2,
    damageType: "kinetic",
    projectileSpeed: 10,
    drawProjectile: (g) =>
      g.beginFill(0xffffff).drawRect(0, -1, 5, 1).endFill(),
  },
  missile: {
    name: "G-Class Missile Launcher",
    rof: 75,
    damage: 10,
    damageType: "explosive",
    projectileSpeed: 6,
    drawProjectile: (g) =>
      g
        .beginFill(0xffffff)
        .drawPolygon([
          { x: 6, y: 2 },
          { x: 6, y: -1 },
          { x: 0, y: -4 },
          { x: 0, y: 4 },
        ])
        .drawCircle(6, 0, 2)
        .endFill(),
  },
};
