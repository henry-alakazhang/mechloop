import { Easing, Tween } from "tweedle.js";
import { PhysicsObject } from "../objects/physics-object";
import { Projectile } from "../objects/projectile";

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
  /** Given a Graphics object, draws the projectile */
  readonly drawProjectile: (g: Projectile) => PhysicsObject;
  /** Callback for when object is hit */
  readonly onHit?: (g: Projectile) => void;
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
    rof: 90,
    damage: 5,
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
    onHit: (g: Projectile) => {
      const explosion = new Projectile({ side: g.side })
        .beginFill(0xff0000)
        .drawCircle(0, 0, 10)
        .endFill();
      explosion.x = g.x;
      explosion.y = g.y;
      // can hit up to 10 targets
      explosion.hp = 10;
      // this weapon, except it doesn't trigger the onHit explosion again.
      // fixme: probably a better way to do this.
      explosion.source = { ...WEAPONS.missile, onHit: undefined };
      explosion.scale;
      g.parent.addChild(explosion);
      new Tween(explosion)
        .to({ scale: { x: 5, y: 5 }, alpha: 0.5 }, 250)
        .easing(Easing.Exponential.Out)
        .onComplete(() => {
          explosion.destroy();
        })
        .start();
    },
  },
};
