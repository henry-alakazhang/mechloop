import { Easing, Tween } from "tweedle.js";
import { WeaponTag } from "../scenes/combat/combat.model";
import { CombatScene } from "../scenes/combat/combat.scene";
import { PhysicsObject } from "../scenes/combat/objects/physics-object";
import { PlayerShip } from "../scenes/combat/objects/player-ship";
import { Projectile } from "../scenes/combat/objects/projectile";

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
  readonly tags: WeaponTag[];
  /** Projectile sped (if applicable) */
  readonly projectileSpeed?: number;
  /**
   * Fire/activate the weapon.
   * Returns any created projectiles and entities.
   *
   * TODO: Move shootbox to Entity so enemies can fire bullets too.
   */
  readonly shoot: (
    shooter: PlayerShip,
    to: { x: number; y: number }
  ) => PhysicsObject[];
  /** Callback for when object is hit */
  readonly onHit?: (g: Projectile) => void;
}

export const autocannon: Weapon = {
  name: "TI-4-G Twin-Mounted Autocannon",
  rof: 270,
  damage: 3,
  damageType: "kinetic",
  tags: ["kinetic", "projectile"],
  projectileSpeed: 10,
  shoot(shooter: PlayerShip, to: { x: number; y: number }) {
    return [
      Projectile.shoot(
        shooter,
        this,
        shooter.shootBox.getGlobalPosition(),
        { ...to, angle: -0.03 },
        (g) => g.beginFill(0xffffff).drawRect(0, -1, 6, 2).endFill()
      ),
      Projectile.shoot(
        shooter,
        this,
        shooter.shootBox.getGlobalPosition(),
        { ...to, angle: 0.03 },
        (g) => g.beginFill(0xffffff).drawRect(0, -1, 6, 2).endFill()
      ),
    ];
  },
};

export const missileLauncher: Weapon = {
  name: "G-Class Missile Launcher",
  rof: 90,
  damage: 10,
  damageType: "explosive",
  tags: ["explosive", "projectile"],
  projectileSpeed: 6,
  shoot(shooter: PlayerShip, to: { x: number; y: number }) {
    return [
      Projectile.shoot(
        shooter,
        // projectile does no damage, only explosion
        { ...this, damage: 0 },
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
  onHit(g: Projectile) {
    const explosion = new Projectile({
      owner: g.owner,
      source: g.source,
      type: "area",
    })
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
      ...this,
      damage: 10, // fixme: don't repeat this
      onHit: undefined,
      tags: ["explosive"],
    };
    explosion.scale;
    g.parent.addChild(explosion);
    new Tween(explosion)
      .to(
        {
          height: 5 * explosion.height,
          width: 5 * explosion.width,
          alpha: 0.5,
        },
        250
      )
      .easing(Easing.Exponential.Out)
      .onComplete(() => {
        explosion.destroy();
      })
      .start();
  },
};

export const shotgun: Weapon = {
  name: "Converted Industrial Shrapnel Ejector",
  rof: 60,
  damage: 2,
  damageType: "kinetic",
  tags: ["kinetic", "projectile"],
  projectileSpeed: 15,
  shoot(shooter: PlayerShip, to: { x: number; y: number }) {
    const arr = [...Array(8)].map((_, index) => {
      // shoots in an arc from the shootbox
      // approx 50 degrees
      const angle = (index - 4) * 0.12 + 0.06;
      return Projectile.shoot(
        shooter,
        this,
        shooter.shootBox.getGlobalPosition(),
        { ...to, angle },
        (g) => g.beginFill(0xffffff).drawRect(0, -1, 6, 2).endFill()
      );
    });
    console.log(arr);
    return arr;
  },
};

export const arcCoil: Weapon = {
  name: "High Impulse Arc Coil",
  damage: 4,
  rof: 150,
  damageType: "energy",
  tags: ["energy"],
  projectileSpeed: 40,
  shoot(shooter: PlayerShip, to: { x: number; y: number }) {
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
      g.setVelocityTo({ x: newTarget.x, y: newTarget.y, speed: 40 });
    }
  },
};
