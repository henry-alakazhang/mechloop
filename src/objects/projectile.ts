import { Weapon } from "../data/weapons";
import { calculateFinalStat } from "../scenes/combat/combat.model";
import { Entity } from "./entity";
import { PhysicsObject } from "./physics-object";

type ProjectileConfig = {
  source: Weapon;
  owner: Entity;
};

export class Projectile extends PhysicsObject {
  /**
   * Literal hit points (how many times this projectile can hit before being destroyed).
   */
  public hp = 1;

  public source: Weapon;
  public owner: Entity;

  constructor(config: ProjectileConfig) {
    super({ side: config.owner.side });

    this.owner = config.owner;
    this.source = config.source;
    this.hp = calculateFinalStat(
      "projectileHP",
      [],
      1,
      this.owner.statAdjustments
    );
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
    if (other instanceof Entity) {
      let finalDamage = calculateFinalStat(
        "damage",
        this.source.damageTags,
        this.source.damage,
        this.owner.statAdjustments
      );
      if (finalDamage > 0) {
        // TODO: make this visible
        const finalCritChance = calculateFinalStat(
          "critChance",
          [],
          this.owner.critChance,
          this.owner.statAdjustments
        );
        const finalCritDamage = calculateFinalStat(
          "critDamage",
          [],
          this.owner.critDamage,
          this.owner.statAdjustments
        );
        if (Math.random() <= finalCritChance) {
          finalDamage *= finalCritDamage;
        }
        other.takeDamage(finalDamage);
      }
      this.source.onHit?.(this);
    }

    return this;
  }
}
