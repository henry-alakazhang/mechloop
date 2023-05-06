import { Weapon } from "../data/weapons";
import { PhysicsObject } from "./physics-object";

export class Projectile extends PhysicsObject {
  public override readonly showHealthBar = "never";

  public source?: Weapon;

  constructor() {
    super();
  }

  onCollide(other: PhysicsObject) {
    // reduce self-HP
    // in most cases, this should destroy the projectile,
    // but piercing projectiles have extra HP so they can survive multiple contacts
    this.hp -= 1;

    // deal self damage to other object\
    if (this.source) {
      other.hp -= this.source?.damage;
      this.source.onHit?.(this);
    }

    return this;
  }
}
