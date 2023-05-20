import { Tween } from "tweedle.js";
import { isDefined } from "../../../util";
import {
  StatAdjustments,
  calculateFinalStat,
  flattenStatAdjustments,
} from "../combat.model";
import { HpBar } from "./hp-bar";
import { PhysicsObject, PhysicsObjectConfig } from "./physics-object";

export type EntityConfig = PhysicsObjectConfig & {
  maxHP: number;
  maxShields?: number;
  showHealthBar?: "never" | "damaged" | "always";
  statAdjustments?: StatAdjustments;
};

/**
 * Temporary buffs and debuffs
 *
 * todo: make this a proper union type so some fields are always needed.
 */
interface Buff {
  /** Name of the buff. Can be left blank if stat adjustments are set. */
  name?: string;
  // icon?: string;
  /** Any stat adjustments applied by the buff */
  stats?: StatAdjustments;
  /**
   * Custom expiry function (to clean up any custom state added)
   *
   * Custom state can be applied manually before adding the buff, probably.
   */
  expire?: (user: CombatEntity) => void;
  /** Remaining duration */
  remaining: number;
}

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
  /** Current HP */
  public hp: number;
  /** Base HP, used to calculate maximum with stat adjustments */
  protected readonly baseHP: number;

  /**
   * Amount of HP protected by armour (cannot be higher than HP).
   * While a unit has armour, all damage is reduced by 10% of the full armour value.
   *
   * Armour stops being effective when it breaks (ie. HP is below `maxHP - armour`).
   *
   * TODO: armour doesn't actually go down, which is kind of convoluted and unintuitive.
   * Should just make it like HP/Shields with an `armour` and `maxArmour` value.
   * Temp armour is already tracked like that anyway...
   */
  public armour = 0;
  /**
   * Temporary armour.
   * Acts like armour (using the base `armour` value), but depletes like HP.
   * Used for when armour is broken (or partly broken) but is restored when not at max HP.
   * It needs to be manually tracked.
   */
  public tempArmour = 0;

  /**
   * HP equivalent of shields.
   * Regenerative defensive layer that recharges after not taking damage for a bit.
   */
  public maxShields = 0;
  /** Current shield value */
  public shields = 0;
  /**
   * Time after taking damage before shields start recharging. (ms)
   */
  public shieldRechargeThreshold = 2000;
  /**
   * Percentage of max shields recharged per second.
   */
  public shieldRechargeRate = 0.5;
  /**
   * Amount of time since the entity last took damage.
   * Used for shield recharge and probably other things.
   */
  protected timeSinceLastHit = 0;

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

  /** Chance for damage dealt by the entity to be critical (max 1) */
  public critChance = 0.0;
  /** Damage multiplier of critical hits */
  public critDamage = 1.5;

  /** Permanent modifications to stats */
  protected baseStatAdjustments: StatAdjustments;
  /** Combined stat adjustments. Recalculated regularly */
  protected _allStatAdjustments: StatAdjustments = {};

  // public interface:
  /**
   * GET stat adjustments for this entity.
   * Combines permanent base stats and buffs/debuffs.
   *
   * SET modifies the BASE stats only and doesn't affect buffs or debuffs.
   */
  public get statAdjustments(): StatAdjustments {
    return this._allStatAdjustments;
  }

  public set statAdjustments(newAdjustments: StatAdjustments) {
    // only change the base stat adjustments.
    this.baseStatAdjustments = newAdjustments;
  }

  /**
   * Temporary buffs or debuffs to stats.
   * Push to this array to add buffs or debuffs.
   */
  public buffs: Buff[];

  private hpBar: HpBar;

  // TODO: move this to some kind of enemies.ts
  public static ASTEROID(scale: number): CombatEntity {
    const size = Math.ceil(Math.random() * 20 + 10) * scale;
    const asteroid = new CombatEntity({ maxHP: size, side: "enemy" })
      .lineStyle(2, 0xaaaa00)
      .drawCircle(0, 0, size + 10);
    asteroid.moveHealthBar();
    return asteroid;
  }

  constructor(config: EntityConfig) {
    super(config);

    const { maxHP, maxShields = 10, statAdjustments = {} } = config;

    this.statAdjustments = statAdjustments;
    this.baseStatAdjustments = statAdjustments;
    this.buffs = [];

    this.baseHP = maxHP;
    this.maxHP = calculateFinalStat("maxHP", [], maxHP, statAdjustments);
    this.hp = this.maxHP;
    this.maxShields = calculateFinalStat(
      "maxShields",
      [],
      maxShields,
      statAdjustments
    );
    this.shields = this.maxShields;

    this.hpBar = this.addChild(new HpBar(config));
  }

  /**
   * Moves the HP Bar to be exactly above the object.
   * Call after adjusting the size or shape of the object.
   */
  protected moveHealthBar() {
    const bounds = this.getLocalBounds();
    if (this.hpBar.y !== bounds.top) {
      this.hpBar.x = bounds.left;
      this.hpBar.y = bounds.top - 5;
    }
  }

  protected override update(delta: number) {
    super.update(delta);

    // a few assertions to help catch random bugs caused by not properly capping values.
    console.assert(this.hp <= this.maxHP);
    console.assert(this.shields <= this.maxShields);

    // increment all timers
    this.timeSinceLastHit += this.ticker.deltaMS;
    this.buffs = this.buffs
      .map((buff) => {
        const remaining = buff.remaining - this.ticker.deltaMS;
        if (remaining <= 0) {
          // fixme: this function should probably be pure?
          buff.expire?.(this);
        }
        return {
          ...buff,
          remaining,
        };
      })
      .filter((buff) => buff.remaining > 0);

    // then recalculate combined stat adjustments
    this._allStatAdjustments = flattenStatAdjustments([
      this.baseStatAdjustments,
      ...this.buffs.map(({ stats }) => stats).filter(isDefined),
    ]);

    // recalculate max HP
    const newMaxHP = calculateFinalStat(
      "maxHP",
      [],
      this.baseHP,
      this.statAdjustments
    );
    if (newMaxHP !== this.maxHP) {
      // keep current HP at the same percentage
      const currentPercentage = this.hp / this.maxHP;
      this.maxHP = newMaxHP;
      this.hp = this.maxHP * currentPercentage;
    }

    // update shield recharge
    if (
      this.shields !== this.maxShields &&
      this.timeSinceLastHit >= this.shieldRechargeThreshold
    ) {
      this.shields = Math.min(
        this.maxShields,
        // recharge rate is a percentage of max shields, per second
        this.shields +
          this.shieldRechargeRate *
            this.maxShields *
            (this.ticker.deltaMS / 1000)
      );
    }

    // redraw HP bar
    this.hpBar.redraw({
      hp: this.hp,
      maxHP: this.maxHP,
      shields: this.shields,
      maxShields: this.maxShields,
      armour: this.armour,
      tempArmour: this.tempArmour,
      statAdjustments: this.statAdjustments,
      width: this.width,
    });
  }

  public onCollide(other: PhysicsObject) {
    // TODO: implement momentum/knockback and prevent objects from sitting inside each other
  }

  public takeDamage(damage: number, tags: string[] = []) {
    // Step 0: Apply avoidances
    const finalAvoidance = calculateFinalStat(
      "avoidance",
      tags as any, // fixme: type this properly
      0,
      this.statAdjustments
    );
    if (Math.random() < finalAvoidance) {
      // do nothing; take no damage; show no effects
      return;
    }

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
    const finalDamage = Math.max(
      0,
      damage * evadedDamageMult - armourDamageReduction
    );

    // If shields are up, damage them instead
    if (this.shields > 0) {
      // note: even if the last hit would overkill the shields, they absorb the entire blow
      // this is probably a balancing factor, and not me being lazy.
      this.shields = Math.max(0, this.shields - finalDamage);
    } else {
      this.hp -= Math.round(finalDamage);
      if (this.tempArmour > 0) {
        // reduce temporary armour if applicable
        this.tempArmour = Math.max(0, this.tempArmour - finalDamage);
      }
    }

    // apply visual effect to denote damage taken
    // fixme: this doesn't work
    new Tween(this).to({ alpha: 0.5 }, 60).to({ alpha: 1 }, 60).start();

    // Final step: Apply any extra effects on hit
    // Mark unit as being hit
    this.timeSinceLastHit = 0;
  }
}
