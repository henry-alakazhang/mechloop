import { Graphics, Ticker } from "pixi.js";
import { normalizeVector } from "../util/math";

export interface PhysicsObjectConfig {
  side: "player" | "enemy";
  ticker?: Ticker;
}

/**
 * A basic graphic object with movement physics.
 */
export abstract class PhysicsObject extends Graphics {
  /** Side for the purposes of collision detection */
  public side: "player" | "enemy";

  /** Probably-unique ID for tracking collision and other state*/
  public id: string;

  private velocityX = 0;
  private velocityY = 0;
  private accelX = 0;
  private accelY = 0;

  /** Amount the acceleration decreases by over time, as a percentage. */
  private friction = 0;

  /** Whether the object should rotate in the direction it's going */
  private shouldRotate = false;

  private ticker: Ticker;

  /**
   * Hit points / survivability of the object.
   * When this reaches 0, the object will be destroyed.
   *
   * Defined differently for different phyics objects,
   * but declared abstractly here for typing convenience.
   */
  public abstract hp: number;

  private updateFunc = this.update.bind(this);

  constructor({ side, ticker = Ticker.shared }: PhysicsObjectConfig) {
    super();

    this.side = side;

    this.ticker = ticker.add(this.updateFunc);
    this.ticker.start();

    this.id = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
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

  protected update(delta: number): void {
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
    this.ticker.remove(this.updateFunc);
    return super.destroy();
  }
}
