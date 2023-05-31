import { Weapon } from "../../../data/weapons";
import { DamageTag, calculateFinalStat } from "../combat.model";
import { CombatEntity } from "./entity";
import { PhysicsObject } from "./physics-object";

type ProjectileConfig = {
  type: "projectile" | "area";
  source: Weapon;
  owner: CombatEntity;
};

/**
 * A projectile or similar object which can be propelled, and damages entities that hit it.
 *
 * todo: rename to like Attack or something?
 */
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
      type: "projectile",
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

  public type: "projectile" | "area";
  public source: Weapon;
  public owner: CombatEntity;

  public tags: DamageTag[];

  constructor(config: ProjectileConfig) {
    super({ side: config.owner.side });

    this.owner = config.owner;
    this.source = config.source;
    this.type = config.type;
    this.hp = calculateFinalStat({
      stat: "projectileHP",
      tags: this.source.tags,
      baseValue: 1,
      adjustments: this.owner.statAdjustments,
    });

    this.tags = [...this.source.tags, this.type];

    const effectSize = calculateFinalStat({
      stat: "effectSize",
      baseValue: 1,
      adjustments: this.owner.statAdjustments,
      tags: this.tags,
    });
    this.scale = { x: effectSize, y: effectSize };
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
        tags: this.tags,
        baseValue: this.source.damage,
        adjustments: this.owner.statAdjustments,
      });
      if (finalDamage > 0) {
        // area effects can't crit
        // todo: implement this using tagging
        if (this.type !== "area") {
          // TODO: make this visible
          const finalCritChance = calculateFinalStat({
            stat: "critChance",
            tags: this.tags,
            baseValue: this.owner.critChance,
            adjustments: this.owner.statAdjustments,
          });
          const finalCritDamage = calculateFinalStat({
            stat: "critDamage",
            tags: this.tags,
            baseValue: this.owner.critDamage,
            adjustments: this.owner.statAdjustments,
          });
          if (Math.random() <= finalCritChance) {
            finalDamage *= finalCritDamage;
          }
        }
        other.takeDamage(finalDamage, this.tags);
      }
      this.source.onHit?.(this);
    }

    return this;
  }
}
