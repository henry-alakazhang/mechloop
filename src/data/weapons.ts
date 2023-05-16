import { Easing, Tween } from "tweedle.js";
import { PhysicsObject } from "../objects/physics-object";
import { Player } from "../objects/player";
import { Projectile } from "../objects/projectile";
import { Tag } from "../scenes/combat/combat.model";
import { CombatScene } from "../scenes/combat/combat.scene";

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
  /** Damage tags for calculating buffs */
  readonly damageTags: Tag["damage"][];
  /** Projectile sped (if applicable) */
  readonly projectileSpeed?: number;
  /**
   * Fire/activate the weapon.
   * Returns any created projectiles and entities.
   *
   * TODO: Move shootbox to Entity so enemies can fire bullets too.
   */
  readonly shoot: (
    shooter: Player,
    to: { x: number; y: number }
  ) => PhysicsObject[];
  /** Callback for when object is hit */
  readonly onHit?: (g: Projectile) => void;
}

export const WEAPONS: { [k: string]: Weapon } = {
  cannon: {
    name: "TI-4-G Twin-Mounted Autocannon",
    rof: 270,
    damage: 6,
    damageType: "kinetic",
    damageTags: ["kinetic", "projectile"],
    projectileSpeed: 10,
    shoot(shooter: Player, to: { x: number; y: number }) {
      return [
        Projectile.shoot(
          shooter,
          this,
          shooter.shootBox.getGlobalPosition(),
          to,
          (g) => g.beginFill(0xffffff).drawRect(0, -1, 6, 2).endFill()
        ),
      ];
    },
  },
  missile: {
    name: "G-Class Missile Launcher",
    rof: 90,
    damage: 1, // explosion has separate damage
    damageType: "explosive",
    damageTags: ["explosive", "projectile"],
    projectileSpeed: 6,
    shoot(shooter: Player, to: { x: number; y: number }) {
      return [
        Projectile.shoot(
          shooter,
          this,
          shooter.shootBox.getGlobalPosition(),
          to,
          (g) =>
            g
              // vaguely resembles a rocket shape
              .beginFill(0xffffff)
              .drawPolygon([
                { x: 6, y: 2 },
                { x: 6, y: -1 },
                { x: 0, y: -4 },
                { x: 0, y: 4 },
              ])
              .drawCircle(6, 0, 2)
              .endFill()
        ),
      ];
    },
    onHit: (g: Projectile) => {
      const explosion = new Projectile({ owner: g.owner, source: g.source })
        .beginFill(0xff0000)
        .drawCircle(0, 0, 10)
        .endFill();
      explosion.x = g.x;
      explosion.y = g.y;
      // can hit up to 10 targets
      explosion.hp = 10;
      // this weapon, except it doesn't trigger the onHit explosion again
      // and is also no longer a projectile
      // fixme: probably a better way to do this.
      explosion.source = {
        ...WEAPONS.missile,
        damage: 10,
        onHit: undefined,
        damageTags: ["explosive"],
      };
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
  arc: {
    name: "High Impulse Arc Coil",
    damage: 4,
    rof: 150,
    damageType: "energy",
    damageTags: ["energy"],
    projectileSpeed: 40,
    shoot(shooter: Player, to: { x: number; y: number }) {
      return [
        Projectile.shoot(
          shooter,
          this,
          shooter.shootBox.getGlobalPosition(),
          to,
          (g) => {
            g.hp = 6;
            return g.beginFill(0xffffff).drawRect(-60, -1, 60, 1).endFill();
          }
        ),
      ];
    },
    onHit: (g) => {
      // chain towards a new target
      // fixme: don't assume the projectile's parent is the combat scene...
      let scene = g.parent as CombatScene;
      const newTarget = scene.getNearbyObject(
        g,
        g.side === "player" ? "enemy" : "player",
        100
      );
      if (newTarget) {
        g.setVelocityTo(newTarget.x, newTarget.y, 40);
      }
    },
  },
};
