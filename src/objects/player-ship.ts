import { DisplayObject, Graphics } from "pixi.js";
import { PhysicsObject } from "./physics-object";

export class PlayerShip extends PhysicsObject {
  public override readonly side = "player";
  public override readonly showHealthBar = "always";
  public shootBox: DisplayObject;

  public directionX: -1 | 0 | 1 = 0;
  public directionY: -1 | 0 | 1 = 0;

  public maxSpeed = 5;

  /** Amount of frames where the player is invincible */
  private iframes = 0;

  constructor() {
    super();

    this.lineStyle(1, 0x00ff00).drawPolygon([
      { x: 10, y: 0 },
      { x: -5, y: -5 },
      { x: 0, y: 0 },
      { x: -5, y: 5 },
    ]);

    // shootbox where bullets spawn from
    this.shootBox = this.addChild(
      new Graphics().beginFill(0x00ff00).drawCircle(0, 0, 1)
    );
    this.shootBox.x = 10;

    this.maxHP = 20;
    this.hp = 20;

    this.moveHealthBar();
  }

  setDirectionX(x: -1 | 0 | 1) {
    this.directionX = x;
    this.setVelocityTo(
      this.x + this.directionX,
      this.y + this.directionY,
      this.maxSpeed
    );
  }

  setDirectionY(y: -1 | 0 | 1) {
    this.directionY = y;
    this.setVelocityTo(
      this.x + this.directionX,
      this.y + this.directionY,
      this.maxSpeed
    );
  }

  override update(delta: number) {
    super.update(delta);
    if (this.iframes > 0) {
      this.iframes = Math.max(0, this.iframes - delta);
    }
  }

  onCollide(other: PhysicsObject) {
    if (this.iframes <= 0) {
      // take 10% of HP in damage
      this.hp -= Math.ceil(this.maxHP * 0.1);
      this.iframes = 10;
    }

    // TODO: implement knockback and prevent objects from hitting each other
  }
}
