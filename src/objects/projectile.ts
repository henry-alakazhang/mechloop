import { Weapon } from "../data/weapons";
import { PhysicsObject, PhysicsObjectConfig } from "./physics-object";

export class Projectile extends PhysicsObject {
  /**
   * Literal hit points (how many times this projectile can hit before being destroyed).
   */
  public hp = 1;

  public source?: Weapon;

  constructor(config: PhysicsObjectConfig) {
    super(config);
  }

  onCollide(other: PhysicsObject) {
    // reduce self-HP
    // in most cases, this should destroy the projectile,
    // but piercing projectiles have extra HP so they can survive multiple contacts
    if (this.hp) {
      this.hp -= 1;
    }

    // deal self damage to other object\
    if (this.source) {
      other.hp -= this.source?.damage;
      this.source.onHit?.(this);
    }

    return this;
  }
}
