import { Graphics, Ticker } from "pixi.js";
import { normalizeVector } from "../util/math";

/**
 * A basic graphic object with movement physics
 */
export abstract class PhysicsObject extends Graphics {
  /** Side for the purposes of collision detection */
  public side: "player" | "enemy" = "player";

  /**
   * Hit points.
   * When this reaches 0, the object is destroyed.
   */
  public maxHP = 1;
  public hp = 1;

  /** Whether to display the healthbar above the object */
  public showHealthBar: "never" | "damaged" | "always" = "never";
  private healthBar: Graphics;

  private velocityX = 0;
  private velocityY = 0;
  private accelX = 0;
  private accelY = 0;

  /** Amount the acceleration decreases by over time, as a percentage. */
  private friction = 0;

  /** Whether the object should rotate in the direction it's going */
  private shouldRotate = false;

  private ticker: Ticker;

  constructor() {
    super();

    this.ticker = new Ticker().add((delta: number) => this.update(delta));
    this.ticker.start();

    this.healthBar = this.addChild(
      new Graphics().beginFill(0x00ff00).drawRect(0, 0, 10, 2).endFill()
    );
    this.healthBar.visible = this.showHealthBar === "always";
  }

  /** Callback for when this physics object with something else */
  abstract onCollide(other: PhysicsObject): void;

  /**
   * Set velocity via explicit x/y velocity.
   */
  public setVelocity(x: number, y: number): this {
    this.velocityX = x;
    this.velocityY = y;
    this.updateRotation();
    return this;
  }

  /**
   * Set velocity to move towards a certain point at a given speed
   */
  public setVelocityTo(x: number, y: number, speed: number): this {
    const { x: vx, y: vy } = normalizeVector(
      { x: x - this.x, y: y - this.y },
      speed
    );
    return this.setVelocity(vx, vy);
  }

  public setAcceleration(x: number, y: number): this {
    this.accelX = x;
    this.accelY = y;
    return this;
  }

  public setFriction(friction: number): this {
    this.friction = friction;
    return this;
  }

  public setRotatable(rotatable: boolean): this {
    this.shouldRotate = rotatable;
    this.updateRotation();
    return this;
  }

  /**
   * Moves the HP Bar to be exactly above the object.
   * Call after adjusting the size or shape of the object.
   */
  public moveHealthBar() {
    const bounds = this.getLocalBounds();
    if (this.healthBar.y !== bounds.top) {
      this.healthBar.x = bounds.left;
      this.healthBar.y = bounds.top - 5;
    }
  }

  protected update(delta: number): void {
    // update health bar visibility and size
    if (this.showHealthBar === "always") {
      this.healthBar.visible = true;
    } else if (this.showHealthBar === "damaged") {
      this.healthBar.visible = this.hp !== this.maxHP;
    } else {
      this.healthBar.visible = false;
    }
    this.healthBar.width = Math.max(0, (this.width * this.hp) / this.maxHP);

    // update physics properties: position, speed, acceleration
    this.x = this.x + this.velocityX * delta;
    this.y = this.y + this.velocityY * delta;

    this.velocityX = this.velocityX + this.accelX * delta;
    this.velocityY = this.velocityY + this.accelY * delta;

    this.accelX = this.accelX * (1 - this.friction) * delta;
    this.accelY = this.accelY * (1 - this.friction) * delta;

    this.updateRotation();
  }

  private updateRotation() {
    // update angle based on movement
    if (this.shouldRotate) {
      this.rotation = Math.atan2(this.velocityY, this.velocityX);
    }
  }

  override destroy() {
    this.ticker.stop();
    return super.destroy();
  }
}
