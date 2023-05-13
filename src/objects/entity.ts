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
 * Tracks all kinds of combat stats for damage calculation and so on.
 */
export class CombatEntity extends PhysicsObject {
  // =============
  // COMBAT STATS
  // =============

  /**
   * Maximum HP of the entity
   */
  public maxHP: number;
  public hp: number;

  /**
   * Amount of HP protected by armour (cannot be higher than HP).
   * While a unit has armour, all damage is reduced by 10% of the full armour value.
   *
   * Armour stops being effective when it breaks (ie. HP is below `maxHP - armour`).
   */
  public armour = 0;
  /**
   * Temporary armour.
   * Acts like armour (using the base `armour` value), but depletes like HP.
   * Used for when armour is broken (or partly broken) but is restored when not at max HP.
   * It needs to be manually tracked.
   */
  public tempArmour = 0;

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

  // todo: probably lump these all into a subcomponent
  private healthBar: Graphics;
  private armourBar: Graphics;

  // TODO: move this to some kind of enemies.ts
  public static ASTEROID(scale: number): CombatEntity {
    const size = Math.ceil(Math.random() * 20) * scale;
    const asteroid = new CombatEntity({ maxHP: size, side: "enemy" })
      .lineStyle(2, 0xaaaa00)
      .drawCircle(0, 0, size + 20);
    asteroid.moveHealthBar();
    return asteroid;
  }

  constructor(config: EntityConfig) {
    super(config);

    const { maxHP, showHealthBar, statAdjustments = {} } = config;

    this.maxHP = calculateFinalStat("maxHP", [], maxHP, statAdjustments);
    this.hp = this.maxHP;
    // if `showHealthBar` is set, use it.
    // otherwise, default to damaged-only healthbars for enemies.
    this.showHealthBar =
      showHealthBar ?? (config.side === "enemy" ? "damaged" : "never");
    this.statAdjustments = statAdjustments;

    this.healthBar = this.addChild(
      new Graphics().beginFill(0x00ff00).drawRect(0, 0, 10, 3)
    );
    this.armourBar = this.addChild(
      new Graphics().beginFill(0xaaaaaa).drawRect(0, 0, 10, 3)
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
      this.armourBar.x = bounds.left;
      this.armourBar.y = bounds.top - 5;
    }
  }

  protected override update(delta: number) {
    super.update(delta);

    // update health bar visibility and size
    if (this.showHealthBar === "always") {
      this.healthBar.visible = true;
      this.armourBar.visible = true;
    } else if (this.showHealthBar === "damaged") {
      this.healthBar.visible = this.hp !== this.maxHP;
      this.armourBar.visible = this.hp !== this.maxHP;
    } else {
      this.healthBar.visible = false;
      this.armourBar.visible = false;
    }

    const finalArmour = Math.min(
      calculateFinalStat("armour", [], this.armour, this.statAdjustments),
      this.maxHP
    );
    const displayedArmour = Math.max(
      // temp armour
      this.tempArmour,
      // remaining armour after lost HP
      finalArmour - (this.maxHP - this.hp)
    );
    // threshold for armour being broken
    const armourThreshold = this.maxHP - finalArmour;

    this.healthBar.width = Math.max(
      0,
      // if hp is below armour threshold, show entire HP
      // if above, cut it off as the rest is displayed by the armour bar
      (this.width * Math.min(this.hp, armourThreshold)) / this.maxHP
    );
    this.armourBar.x = this.healthBar.x + this.healthBar.width;
    this.armourBar.width = Math.max(
      0,
      (this.width * displayedArmour) / this.maxHP
    );
  }

  public onCollide(other: PhysicsObject) {
    // TODO: implement momentum/knockback and prevent objects from sitting inside each other
  }

  public takeDamage(damage: number) {
    // Step 1: Apply general damage reductions

    // Step 2: Calculate and apply defenses:
    // Evasion:
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

    // Armour:
    const finalArmour = Math.min(
      calculateFinalStat("armour", [], this.armour, this.statAdjustments),
      this.maxHP
    );
    let armourDamageReduction = 0;
    if (this.hp > this.maxHP - finalArmour || this.tempArmour > 0) {
      armourDamageReduction = finalArmour / 10;
    }

    // Step 3: Calculate final damage and apply
    const finalDamage = damage * evadedDamageMult - armourDamageReduction;

    this.hp -= Math.round(finalDamage);
    if (this.tempArmour > 0) {
      // reduce temporary armour if applicable
      this.tempArmour = Math.max(0, this.tempArmour - finalDamage);
    }

    // apply visual effect to denote damage taken
    // fixme: this doesn't work
    new Tween(this).to({ alpha: 0.5 }, 60).to({ alpha: 1 }, 60).start();
  }
}
