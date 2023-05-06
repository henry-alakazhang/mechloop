import { PhysicsObject } from "./physics-object";

export class Projectile extends PhysicsObject {
  public override readonly showHealthBar = "never";

  public damage = 0;

  constructor() {
    super();
  }

  onCollide(other: PhysicsObject) {
    // reduce self-HP
    // in most cases, this should destroy the projectile,
    // but piercing projectiles have extra HP so they can survive multiple contacts
    this.hp -= 1;

    // deal self damage to other object
    other.hp -= this.damage;

    return this;
  }
}
