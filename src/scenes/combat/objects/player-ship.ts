import { DisplayObject, Graphics } from "pixi.js";
import { CombatEntity } from "./entity";
import { PhysicsObject } from "./physics-object";

/**
 * The player-controlled ship. Tracks player movement.
 *
 * Origin (0,0) is in the middle of the ship, as it needs to rotate around it.
 */
export class PlayerShip extends CombatEntity {
  /** Coordinates to fire bullets from */
  public shootBox: DisplayObject;

  /** Horizontal movement direction */
  public directionX: -1 | 0 | 1 = 0;
  /** Vertical movement direction */
  public directionY: -1 | 0 | 1 = 0;

  public maxSpeed = 5;

  constructor() {
    super({
      side: "player",
      maxHP: 30,
      // player healthbar is displayed separately in the combat scene.
      showHealthBar: "never",
    });

    this.lineStyle(1, 0x00ff00).drawPolygon([
      { x: 15, y: 0 },
      { x: -8, y: -8 },
      { x: 0, y: 0 },
      { x: -8, y: 8 },
    ]);

    // shootbox where bullets spawn from
    this.shootBox = this.addChild(
      new Graphics().beginFill(0x00ff00).drawCircle(0, 0, 1)
    );
    this.shootBox.x = 10;

    this.moveHealthBar();
  }

  public setDirectionX(x: -1 | 0 | 1) {
    this.directionX = x;
    this.setVelocityTo(
      this.x + this.directionX,
      this.y + this.directionY,
      this.maxSpeed
    );
  }

  public setDirectionY(y: -1 | 0 | 1) {
    this.directionY = y;
    this.setVelocityTo(
      this.x + this.directionX,
      this.y + this.directionY,
      this.maxSpeed
    );
  }

  protected override update(delta: number) {
    super.update(delta);
  }

  public override onCollide(other: PhysicsObject) {
    super.onCollide(other);

    // 250ms of invulnerability after collision
    if (this.timeSinceLastHit >= 250) {
      // take 5% of each side'sdw HP as damage
      if (other instanceof CombatEntity) {
        this.takeDamage(Math.ceil(this.maxHP * 0.05 + other.maxHP * 0.05), [
          "collision",
        ]);
      }
    }
  }
}
