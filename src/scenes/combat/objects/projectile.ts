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
   * Creates/fires a number projectile of a given type towards a given target location
   */
  public static shoot({
    owner,
    source,
    from,
    to,
    count = 1,
    angle = 0.1,
    drawProjectile,
  }: {
    /** The combat entity that owns this. Used for stat adjustments to damage etc. */
    owner: CombatEntity;
    /** The source of the projectile. TODO: add support for skills or whatever */
    source: Weapon;
    /** Origin point of the projectile. TODO: make optional and build into the combat entity? */
    from: { x: number; y: number };
    /** Target location and optional variation angle */
    to: { x: number; y: number };
    /**
     * Base number of projectiles to create. Can be modified by stat adjustments.
     *
     * Default value: 1
     */
    count?: number;
    /**
     * Angle between multiple projectiles in RADIANS.
     *
     * Default value: 0.1
     */
    angle?: number;
    /** Callback to apply graphics calls to the Projectile itself */
    drawProjectile: (g: Projectile) => Projectile;
  }): Projectile[] {
    const finalCount = Math.round(
      calculateFinalStat({
        stat: "projectileCount",
        baseValue: count,
        tags: source.tags,
        adjustments: owner.statAdjustments,
      })
    );
    const finalAngle = calculateFinalStat({
      stat: "projectileSpread",
      baseValue: angle,
      tags: source.tags,
      adjustments: owner.statAdjustments,
    });

    return [
      // create this many projectiles
      ...Array(finalCount),
    ].map((_, index) => {
      const deviation =
        finalCount % 2 === 1
          ? // odd projectile count: leave one in the middle (count/2) and the rest on either side
            (index - Math.round(finalCount / 2)) * finalAngle
          : // even projectiles count: offset everything so there's one in the middle
            (index - Math.round(finalCount / 2)) * finalAngle + finalAngle / 2;
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
        deviation,
      });
      return projectile;
    });
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
