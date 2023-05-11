/**
 * Names of stats in the game. These represent different modifiable... stats...
 */
export type Stat =
  | "damage"
  | "rof"
  | "projectileHP"
  | "critChance"
  | "critDamage";

/**
 * Tags for stat modifiers. Each stat has different available tags,
 * and adjustments can be applied to these stats based on these tags
 *
 * eg. "kinetic" and "projectile" might be "damage" tags.
 * "+10% Kinetic Damage" would be applied to the "kinetic" tag.
 */
export type Tag = {
  damage: "kinetic" | "projectile" | "explosive" | "energy";
  rof: never;
  projectileHP: "kinetic" | "explosive";
  critChance: never;
  critDamage: never;
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
      addition: number;
      /** Total multiplier to a stat. Stored as an additive percentage (eg. +20%, -20%) */
      multiplier: number;
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
        [k: string]: { addition: number; multiplier: number } | undefined;
      }
    | undefined;
};

export function flattenStatAdjustments(
  adjustments: StatAdjustments[]
): StatAdjustments {
  return adjustments.reduce<StatAdjustments>(
    (acc, next) => {
      let untypedNext: UntypedStatAdjustment = next;
      let untypedAcc: UntypedStatAdjustment = acc;
      for (let stat in untypedNext) {
        // grab adjustment from the flattened accumulator (or create it if it doesn't exist)
        const accStats = untypedAcc[stat] ?? {};
        for (let tag in untypedNext[stat]) {
          // grab adjustment from the flattened accumulator (or create it if it doesn't exist)
          const adjustments = accStats[tag] ?? {
            addition: 0,
            multiplier: 0,
          };
          adjustments.addition += untypedNext[stat]![tag]!.addition;
          adjustments.multiplier += untypedNext[stat]![tag]!.multiplier;
          accStats[tag] = adjustments;
        }
        untypedAcc[stat] = accStats;
      }
      // note: `untypedAcc` is a reference to this, so we've modified this too.
      // returning `acc` here just (once again) lies to the type system.
      return acc;
    },
    { damage: {}, rof: {} }
  );
}

export function calculateFinalStat<S extends Stat>(
  stat: S,
  tags: Tag[S][],
  baseValue: number,
  adjustments: StatAdjustments
) {
  let statAdjustments = adjustments[stat];
  if (statAdjustments) {
    let totalMultiplier = 1;
    let totalAddition = 0;

    // always apply global adjustments, in addition to specified tags
    for (const tag of ["global" as const, ...tags]) {
      const adjustment = statAdjustments[tag];
      if (adjustment) {
        totalMultiplier += adjustment.multiplier;
        totalAddition += adjustment.addition;
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
  global: "Global",
  kinetic: "Kinetic",
  explosive: "Explosive",
  energy: "Energy",
  projectile: "Projectile",
  damage: "Damage",
  rof: "Rate of Fire",
  projectileHP: "Projectile HP (Pierces)",
  critChance: "Critical Strike Chance",
  critDamage: "Critical Damage Multiplier",
};

export function getAdjustmentDescriptions(
  adjustments: UntypedStatAdjustment
): string {
  let text = "";
  for (let stat in adjustments) {
    for (let tag in adjustments[stat]) {
      const adjustment = adjustments[stat]![tag]!;
      if (adjustment.addition !== 0) {
        const additionSign = adjustment.addition > 0 ? "+" : "";
        text += `${additionSign}${adjustment.addition} to ${
          displayText[tag as Tag[Stat]]
        } ${displayText[stat as Stat]}\n`;
      }
      if (adjustment.multiplier !== 0) {
        const multiplierSign = adjustment.multiplier > 0 ? "+" : "";
        text += `${multiplierSign}${Math.round(adjustment.multiplier * 100)}% ${
          displayText[tag as Tag[Stat]]
        } ${displayText[stat as Stat]}\n`;
      }
    }
  }
  return text;
}
