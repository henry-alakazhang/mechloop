import { Tween } from "tweedle.js";
import { isDefined } from "../../../util";
import {
  Condition,
  DamageTag,
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
   * Maximum amount of HP protected by armour (cannot be higher than HP).
   * While a unit has armour, all damage is reduced by the entity's armour class.
   *
   * This is not really used for anything useful at the moment,
   * but will become relevant once HP repair comes into play.
   */
  public maxArmour = 0;
  /**
   * Current armour. This is tracked and removed alongside HP.
   * While a unit has armour, all damage is reduced by the entity's armour class.
   */
  public armour = 0;
  /**
   * Armour class - effectiveness of armour.
   * Damage dealt to armour is reduced by this amount.
   */
  public armourClass = 1;

  /**
   * HP equivalent of shields.
   * Regenerative defensive layer that recharges after not taking damage for a bit.
   */
  public maxShields = 0;
  /** Current shield value */
  public shields = 0;
  /** Base shields, used to calculate max shields with stat adjustments */
  private readonly baseShields;

  /**
   * Time after taking damage before shields start recharging. (ms)
   */
  public shieldRechargeThreshold = 4000;
  /**
   * Percentage of max shields recharged per second.
   */
  public shieldRechargeRate = 0.25;
  /**
   * Amount of time since the entity last took damage.
   * Used for shield recharge and probably other things.
   */
  protected timeSinceLastHit = 0;

  /**
   * Chance to evade attacks (cause them to glance)
   * Can scale past 1 and applies multiple times.
   */
  public evadeChance = 0.0;
  /**
   * Damage reduction for glancing hits.
   * Subtracted from the hit damage.
   */
  public evadeEffect = 0.25;

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

  public conditionalStats: {
    condition: Condition;
    statAdjustments: StatAdjustments;
  }[] = [];

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

    const { maxHP, maxShields = 0, statAdjustments = {} } = config;

    this.statAdjustments = statAdjustments;
    this.baseStatAdjustments = statAdjustments;
    this.buffs = [];

    this.baseHP = maxHP;
    this.maxHP = calculateFinalStat({
      stat: "maxHP",
      baseValue: maxHP,
      adjustments: statAdjustments,
    });
    this.hp = this.maxHP;
    this.baseShields = maxShields;
    this.maxShields = calculateFinalStat({
      stat: "maxShields",
      baseValue: maxShields,
      adjustments: statAdjustments,
    });
    this.shields = this.maxShields;
    this.maxArmour = calculateFinalStat({
      stat: "armour",
      baseValue: 0,
      adjustments: statAdjustments,
    });
    this.armour = this.maxArmour;

    // if `showHealthBar` is set, use it.
    // otherwise, default to damaged-only healthbars for enemies.
    const showHealthBar =
      config.showHealthBar ?? (config.side === "enemy" ? "damaged" : "never");

    this.hpBar = this.addChild(new HpBar({ showHealthBar }));
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
    // PERF: do this on a lower tick rate if performance is an issue
    this._allStatAdjustments = flattenStatAdjustments([
      // base stats
      this.baseStatAdjustments,
      // temporary buffs
      ...this.buffs.map(({ stats }) => stats).filter(isDefined),
      // conditional effects that are met
      ...this.conditionalStats.map(({ condition, statAdjustments }) =>
        this.meetsCondition(condition) ? statAdjustments : {}
      ),
    ]);

    // recalculate max HP
    const newMaxHP = calculateFinalStat({
      stat: "maxHP",
      baseValue: this.baseHP,
      adjustments: this.statAdjustments,
    });
    if (newMaxHP !== this.maxHP) {
      // keep current HP at the same percentage
      const currentPercentage = this.hp / this.maxHP;
      this.maxHP = newMaxHP;
      this.hp = this.maxHP * currentPercentage;
    }

    // recalculate max shields
    const newMaxShields = calculateFinalStat({
      stat: "maxShields",
      baseValue: this.baseShields,
      adjustments: this.statAdjustments,
    });
    // shields can regenerate, so we don't need to adjust current value.
    this.maxShields = newMaxShields;

    // recalculate max armour
    const newMaxArmour = calculateFinalStat({
      stat: "armour",
      baseValue: 0,
      adjustments: this.statAdjustments,
    });
    // armour regenerates worse, so we shoiuld adjust current value.
    this.armour += newMaxArmour - this.maxArmour;
    this.maxArmour = newMaxArmour;

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
    // all the fields needed for HP calculation are on this self class
    this.hpBar.redraw(this);
  }

  private meetsCondition(condition: Condition): boolean {
    const [stat, operator, value] = condition;
    if (!isDefined(stat)) {
      return false;
    }
    switch (operator) {
      case "==":
        return this[stat] === value;
      case "<=":
        return this[stat] <= value;
      case ">=":
        return this[stat] >= value;
      default:
        // enforces exhaustive switch.
        // if this shows "string is not assignable to boolean",
        // there's a case that hasn't been handled.
        return operator;
    }
  }

  public onCollide(other: PhysicsObject) {
    // TODO: implement momentum/knockback and prevent objects from sitting inside each other
  }

  public takeDamage(damage: number, tags: DamageTag[] = []) {
    // Step 0: Apply avoidances
    const finalAvoidance = calculateFinalStat({
      stat: "avoidance",
      tags,
      baseValue: 0,
      adjustments: this.statAdjustments,
    });
    if (Math.random() < finalAvoidance) {
      // do nothing; take no damage; show no effects
      return;
    }

    // Step 1: Apply general damage reductions

    // Step 2: Calculate and apply defenses:
    // Evasion:
    const finalEvadeChance = calculateFinalStat({
      stat: "evadeChance",
      baseValue: this.evadeChance,
      adjustments: this.statAdjustments,
    });
    const finalEvadeEffect = calculateFinalStat({
      stat: "evadeEffect",
      baseValue: this.evadeEffect,
      adjustments: this.statAdjustments,
    });
    // Evade chance stacks past 100%; each one applies multiple times.
    const evasionStacks = Math.floor(finalEvadeChance);
    let evadedDamageMult = (1 - finalEvadeEffect) ** evasionStacks;
    // The ramining % is calculated randomly
    if (Math.random() < finalEvadeChance - evasionStacks) {
      evadedDamageMult *= 1 - finalEvadeEffect;
    }

    // Armour:
    const armourDamageReduction = this.armour > 0 ? this.armourClass : 0;

    // Step 3: Calculate final damage and apply
    const finalDamage = Math.max(
      1,
      damage * evadedDamageMult - armourDamageReduction
    );

    // If shields are up, damage them instead
    if (this.shields > 0) {
      // note: even if the last hit would overkill the shields, they absorb the entire blow
      // this is probably a balancing factor, and not me being lazy.
      this.shields = Math.max(0, this.shields - finalDamage);
    } else {
      this.hp -= Math.round(finalDamage);
      if (this.armour > 0) {
        // reduce armour if applicable
        this.armour = Math.max(0, this.armour - finalDamage);
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
