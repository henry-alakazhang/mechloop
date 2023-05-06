import { Graphics } from "pixi.js";
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
      const parent = g.parent;
      const aoe = parent.addChild(
        new Graphics().beginFill(0xff0000).drawCircle(0, 0, 50).endFill()
      );
      aoe.x = g.x;
      aoe.y = g.y;
      g.parent.children
        .filter((c): c is PhysicsObject => {
          if (!(c instanceof PhysicsObject)) {
            return false;
          }
          if (g.side === c.side) {
            return false;
          }
          return c.getBounds().intersects(aoe.getBounds());
        })
        .forEach((target: PhysicsObject) => {
          if (g.source) {
            target.hp -= g.source?.damage;
          }
        });
      // TODO: figure out a better way of handling this
      setTimeout(() => parent.removeChild(aoe), 100);
    },
  },
};
