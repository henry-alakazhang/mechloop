import { CombatEntity } from "./objects/entity";

/**
 * Names of stats in the game. These represent different modifiable... stats...
 */
export type Stat =
  | "damage"
  | "rof"
  | "projectileHP"
  | "critChance"
  | "critDamage"
  | "maxHP"
  | "maxShields"
  // TODO: this should probably be called "glance",
  // because that's what it actually does (reduce damage)
  // But "glance chance" just sounds way too cheesy lol.
  | "evadeChance"
  | "evadeEffect"
  | "avoidance"
  | "armour"
  | "armourClass"
  // Direct modifiers to damage taken. Can be negative to reduce damage.
  | "damageTaken"
  | "rechargeSpeed"
  | "effectSize";

export type WeaponTag = "kinetic" | "explosive" | "energy" | "projectile";
export type DamageTag = WeaponTag | "collision" | "area";
export type SkillTag = "movement" | "defensive";

/**
 * Tags for stat modifiers. Each stat has different available tags,
 * and adjustments can be applied to these stats based on these tags
 *
 * eg. "kinetic" and "projectile" might be "damage" tags.
 * "+10% Kinetic Damage" would be applied to the "kinetic" tag.
 */
export type Tag = {
  damage: DamageTag;
  rof: WeaponTag;
  projectileHP: WeaponTag;
  critChance: DamageTag;
  critDamage: DamageTag;
  maxHP: never;
  maxShields: never;
  evadeChance: never;
  evadeEffect: never;
  avoidance: DamageTag;
  damageTaken: DamageTag;
  armour: never;
  armourClass: never;
  rechargeSpeed: SkillTag;
  effectSize: DamageTag;
};

/**
 * A model representing all possible stats and changes applied
 * from various buffs and passive effects.
 */
export type StatAdjustments = {
  // possibly all stats
  [s in Stat]?: {
    // and possibly all tags for those stats.
    // TODO: support multi-tag stat adjustments
    // eg 1. affects one of many tags, but only once
    // eg 2. affects something with multiple specific tags
    //
    // NOTE: if you get a "Tag[s] is not assignable to string" type error here,
    // it means the Tag type doesn't cover all the Stats.
    [t in Tag[s] | "global"]?: {
      /** Flat additions to a stat. Applied before all multipliers. */
      addition?: number;
      /** Total multiplier to a stat. Stored as an additive percentage (eg. +20%, -20%) */
      multiplier?: number;
    };
  };
};

/**
 * A little hack to work around some edge cases in the type system.
 * Using explicit `Stat` and `Tag` types helps with validating values,
 * but TypeScript starts getting confused when merging different trees due to unclear `s` in `Tag[s]`
 */
type UntypedStatAdjustment = {
  [k: string]:
    | {
        [k: string]: { addition?: number; multiplier?: number } | undefined;
      }
    | undefined;
};

export function flattenStatAdjustments(
  adjustments: StatAdjustments[]
): StatAdjustments {
  return adjustments.reduce<StatAdjustments>((acc, next) => {
    let untypedNext: UntypedStatAdjustment = next;
    let untypedAcc: UntypedStatAdjustment = acc;
    for (let stat in untypedNext) {
      // grab adjustment from the flattened accumulator (or create it if it doesn't exist)
      const accStats = untypedAcc[stat] ?? {};
      for (let tag in untypedNext[stat]) {
        // grab adjustment from the flattened accumulator (or create it if it doesn't exist)
        const adjustments = {
          addition: accStats[tag]?.addition ?? 0,
          multiplier: accStats[tag]?.multiplier ?? 0,
        };
        adjustments.addition += untypedNext[stat]![tag]!.addition ?? 0;
        adjustments.multiplier += untypedNext[stat]![tag]!.multiplier ?? 0;
        accStats[tag] = adjustments;
      }
      untypedAcc[stat] = accStats;
    }
    // note: `untypedAcc` is a reference to this, so we've modified this too.
    // returning `acc` here just (once again) lies to the type system.
    return acc;
  }, {});
}

export function calculateFinalStat<S extends Stat>({
  stat,
  baseValue,
  adjustments,
  tags = [],
}: {
  stat: S;
  baseValue: number;
  adjustments: StatAdjustments;
} & (Tag[S] extends never
  ? // this forces `tags` to be undefined if there are no valid tags for the stat.
    // otherwise, it has to be provided and have valid values
    { tags?: never }
  : { tags: Tag[S][] })) {
  let statAdjustments = adjustments[stat];
  if (statAdjustments) {
    let totalMultiplier = 1;
    let totalAddition = 0;

    // always apply global adjustments, in addition to specified tags
    for (const tag of ["global" as const, ...tags]) {
      const adjustment = statAdjustments[tag];
      if (adjustment) {
        totalMultiplier += adjustment.multiplier ?? 0;
        totalAddition += adjustment.addition ?? 0;
      }
    }

    return (baseValue + totalAddition) * totalMultiplier;
  }
  return baseValue;
}

const displayText: {
  [s in Tag[Stat] | "global"]: string;
} & {
  [s in Stat]: string;
} = {
  global: "", // global is just the default display (eg. "% increased damage")
  kinetic: "Kinetic",
  explosive: "Explosive",
  energy: "Energy",
  projectile: "Projectile",
  area: "Area",
  collision: "Collision",
  damage: "Damage",
  rof: "Rate of Fire",
  projectileHP: "Projectile HP (Pierces)",
  critChance: "Critical Strike Chance",
  critDamage: "Critical Damage Multiplier",
  maxHP: "Max HP",
  maxShields: "Shields",
  evadeChance: "Evasion Chance",
  evadeEffect: "Damage reduction from evaded attacks",
  avoidance: "Chance to completely avoid damage",
  damageTaken: "Damage Taken",
  armour: "Armour",
  armourClass: "Armour Class (Damage Reduction)",
  rechargeSpeed: "Tech Recharge Speed",
  effectSize: "Effect Size",
  defensive: "Defensive",
  movement: "Movement",
};

export function getAdjustmentDescriptions(
  adjustments: UntypedStatAdjustment
): string {
  let text = "";
  for (let stat in adjustments) {
    for (let tag in adjustments[stat]) {
      const adjustment = adjustments[stat]![tag]!;
      const addition = adjustment.addition ?? 0;
      const multiplier = adjustment.multiplier ?? 0;
      if (addition !== 0) {
        // add + sign for positive numbers (negative sign is added automatically);
        const additionSign = addition > 0 ? "+" : "";
        // add % sign for % values (< 1);
        // fixme: doesn't work if it's > 100%.
        const valueDisplay = addition < 1 ? `${addition * 100}%` : addition;
        text += `${additionSign}${valueDisplay} to ${
          displayText[tag as Tag[Stat]]
        } ${displayText[stat as Stat]}\n`;
      }
      if (multiplier !== 0) {
        const multiplierSign = multiplier > 0 ? "+" : "";
        text += `${multiplierSign}${Math.round(multiplier * 100)}% ${
          displayText[tag as Tag[Stat]]
        } ${displayText[stat as Stat]}\n`;
      }
    }
  }
  return text;
}

// grabs out all the keys of type T that are numbers
type NumberProperty<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

/**
 * A condition on some property of a CombatEntity.
 * Tuple of three values: `[stat, comparison, value]`.
 */
export type Condition = [
  NumberProperty<CombatEntity>,
  "==" | ">=" | "<=",
  number
];
// Multiple conditions stacked together
// TODO: implement and handle when needed.
// export type MultiCond = Condition | [MultiCond, "and" | "or", MultiCond];
