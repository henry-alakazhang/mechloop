import { PhysicsObject } from "./physics-object";

export class Enemy extends PhysicsObject {
  public override readonly side = "enemy";
  public override readonly showHealthBar = "damaged";

  public static ASTEROID(): Enemy {
    const size = Math.floor(Math.random() * 20);
    const asteroid = new Enemy()
      .lineStyle(2, 0xaaaa00)
      .drawCircle(0, 0, size + 20);
    asteroid.maxHP = size;
    asteroid.hp = size;
    asteroid.moveHealthBar();
    return asteroid;
  }

  constructor() {
    super();
  }

  onCollide(other: PhysicsObject) {
    // TODO: something
  }
}
