import { Weapon } from "../../../data/weapons";
import { calculateFinalStat } from "../combat.model";
import { CombatEntity } from "./entity";
import { PhysicsObject } from "./physics-object";

type ProjectileConfig = {
  source: Weapon;
  owner: CombatEntity;
};

export class Projectile extends PhysicsObject {
  /**
   * Creates/fires a projectile of a given type towards a given target location
   */
  public static shoot(
    owner: CombatEntity,
    source: Weapon,
    from: { x: number; y: number },
    to: { x: number; y: number; angle?: number },
    drawProjectile: (g: Projectile) => Projectile
  ): Projectile {
    const projectile = new Projectile({
      owner,
      source,
    }).setRotatable(true);
    drawProjectile(projectile);
    projectile.x = from.x;
    projectile.y = from.y;
    projectile.setVelocityTo({
      x: to.x,
      y: to.y,
      speed: source.projectileSpeed ?? 10,
      deviation: to.angle,
    });

    return projectile;
  }

  /**
   * Literal hit points (how many times this projectile can hit before being destroyed).
   */
  public hp = 1;

  public source: Weapon;
  public owner: CombatEntity;

  constructor(config: ProjectileConfig) {
    super({ side: config.owner.side });

    this.owner = config.owner;
    this.source = config.source;
    this.hp = calculateFinalStat({
      stat: "projectileHP",
      tags: this.source.tags,
      baseValue: 1,
      adjustments: this.owner.statAdjustments,
    });
  }

  onCollide(other: PhysicsObject) {
    // reduce self-HP
    // in most cases, this should destroy the projectile,
    // but piercing projectiles have extra HP so they can survive multiple contacts
    if (this.hp) {
      this.hp -= 1;
    }

    // deal self damage to other object
    // TODO: move this to some kind of helper file for calculating damage
    if (other instanceof CombatEntity) {
      let finalDamage = calculateFinalStat({
        stat: "damage",
        tags: this.source.tags,
        baseValue: this.source.damage,
        adjustments: this.owner.statAdjustments,
      });
      if (finalDamage > 0) {
        // TODO: make this visible
        const finalCritChance = calculateFinalStat({
          stat: "critChance",
          tags: this.source.tags,
          baseValue: this.owner.critChance,
          adjustments: this.owner.statAdjustments,
        });
        const finalCritDamage = calculateFinalStat({
          stat: "critDamage",
          tags: this.source.tags,
          baseValue: this.owner.critDamage,
          adjustments: this.owner.statAdjustments,
        });
        if (Math.random() <= finalCritChance) {
          finalDamage *= finalCritDamage;
        }
        other.takeDamage(finalDamage, this.source.tags);
      }
      this.source.onHit?.(this);
    }

    return this;
  }
}
