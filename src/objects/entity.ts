import { Graphics } from "pixi.js";
import { Tween } from "tweedle.js";
import {
  StatAdjustments,
  calculateFinalStat,
} from "../scenes/combat/combat.model";
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
  // =============
  // COMBAT STATS
  // =============

  /**
   * Maximum HP of the entity
   */
  public maxHP: number;
  public hp: number;

  /** Chance for damage dealt by the entity to be critical (max 1) */
  public critChance = 0.0;
  /** Damage multiplier of critical hits */
  public critDamage = 1.5;

  /**
   * Chance to evade attacks (cause them to glance)
   * Can scale past 1 and applies multiple times.
   */
  public evadeChance = 0.5;
  /**
   * Damage reduction for glancing hits.
   * Subtracted from the hit damage.
   */
  public evadeEffect = 0.5;

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

  public takeDamage(damage: number) {
    const finalEvadeChance = calculateFinalStat(
      "evadeChance",
      [],
      this.evadeChance,
      this.statAdjustments
    );
    const finalEvadeEffect = calculateFinalStat(
      "evadeEffect",
      [],
      this.evadeEffect,
      this.statAdjustments
    );
    // Evade chance stacks past 100%; each one applies multiple times.
    const evasionStacks = Math.floor(finalEvadeChance);
    let evadedDamageMult = (1 - finalEvadeEffect) ** evasionStacks;
    // The ramining % is calculated randomly
    if (Math.random() < finalEvadeChance - evasionStacks) {
      evadedDamageMult *= 1 - finalEvadeEffect;
    }

    const finalDamage = damage * evadedDamageMult;

    this.hp -= finalDamage;
    // apply visual effect to denote damage taken
    // fixme: this doesn't work
    new Tween(this).to({ alpha: 0.5 }, 60).to({ alpha: 1 }, 60).start();
  }
}
