import { Graphics } from "pixi.js";
import { StatAdjustments } from "../scenes/combat.model";
import { PhysicsObject, PhysicsObjectConfig } from "./physics-object";

export type EntityConfig = PhysicsObjectConfig & {
  maxHP: number;
  showHealthBar?: "never" | "damaged" | "always";
  statAdjustments?: StatAdjustments;
};

/**
 * Base object for ships and other shootable/collideable entities.
 *
 * Tracks HP and displays it as a healthbar over the entity.
 */
export class Entity extends PhysicsObject {
  /**
   * Hit points.
   * When this reaches 0, the object is destroyed.
   */
  public maxHP: number;
  public hp: number;

  public statAdjustments: StatAdjustments;

  /** Whether to display the healthbar above the object */
  public showHealthBar: "never" | "damaged" | "always";
  private healthBar: Graphics;

  // TODO: move this to some kind of enemies.ts
  public static ASTEROID(scale: number): Entity {
    const size = Math.ceil(Math.random() * 20) * scale;
    const asteroid = new Entity({ maxHP: size, side: "enemy" })
      .lineStyle(2, 0xaaaa00)
      .drawCircle(0, 0, size + 20);
    asteroid.moveHealthBar();
    return asteroid;
  }

  constructor(config: EntityConfig) {
    super(config);

    const { maxHP, showHealthBar, statAdjustments } = config;

    this.maxHP = maxHP;
    this.hp = maxHP;
    // if `showHealthBar` is set, use it.
    // otherwise, default to damaged-only healthbars for enemies.
    this.showHealthBar =
      showHealthBar ?? (config.side === "enemy" ? "damaged" : "never");
    this.statAdjustments = statAdjustments ?? {};

    this.healthBar = this.addChild(
      new Graphics().beginFill(0x00ff00).drawRect(0, 0, 10, 2).endFill()
    );
    this.healthBar.visible = this.showHealthBar === "always";
  }

  /**
   * Moves the HP Bar to be exactly above the object.
   * Call after adjusting the size or shape of the object.
   */
  protected moveHealthBar() {
    const bounds = this.getLocalBounds();
    if (this.healthBar.y !== bounds.top) {
      this.healthBar.x = bounds.left;
      this.healthBar.y = bounds.top - 5;
    }
  }

  protected override update(delta: number) {
    super.update(delta);

    // update health bar visibility and size
    if (this.showHealthBar === "always") {
      this.healthBar.visible = true;
    } else if (this.showHealthBar === "damaged") {
      this.healthBar.visible = this.hp !== this.maxHP;
    } else {
      this.healthBar.visible = false;
    }
    this.healthBar.width = Math.max(0, (this.width * this.hp) / this.maxHP);
  }

  public onCollide(other: PhysicsObject) {
    // TODO: implement momentum/knockback and prevent objects from sitting inside each other
  }
}
