import { DisplayObject, Graphics } from "pixi.js";
import { DamageTag } from "../combat.model";
import { CombatEntity } from "./entity";

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

  // PERF: make a map if needed
  public activeEnhancements: string[] = [];

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
    this.setVelocityTo({
      x: this.x + this.directionX,
      y: this.y + this.directionY,
      speed: this.maxSpeed,
    });
  }

  public setDirectionY(y: -1 | 0 | 1) {
    this.directionY = y;
    this.setVelocityTo({
      x: this.x + this.directionX,
      y: this.y + this.directionY,
      speed: this.maxSpeed,
    });
  }

  protected override update(delta: number) {
    super.update(delta);
  }

  public override takeDamage(amount: number, tags: DamageTag[]) {
    super.takeDamage(amount, tags);

    // brief invulnerability on being hit
    this.buffs.push({
      remaining: 250,
      stats: {
        avoidance: { global: { addition: 1 } },
      },
    });
  }
}
