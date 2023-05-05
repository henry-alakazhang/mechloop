import { Graphics, Ticker } from "pixi.js";

/**
 * A basic graphic object with movement physics
 */
export class PhysicsObject extends Graphics {
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
  }

  public setVelocity(x: number, y: number): this {
    this.velocityX = x;
    this.velocityY = y;
    this.updateRotation();
    return this;
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

  private update(delta: number): void {
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
