import { Tween } from "tweedle.js";
import { CombatEntity } from "../objects/entity";
import { PhysicsObject } from "../objects/physics-object";
import { Player } from "../objects/player";
import { calculateFinalStat } from "../scenes/combat/combat.model";

/**
 * Techs, ie. active skills
 *
 * Press a button, get an effect.
 */
export interface ActiveSkill {
  /** Display name */
  readonly name: string;
  /** Description. Should describe what the skill does */
  readonly description: string;
  /** Base time between usages (ms) */
  readonly cooldown: number;
  /** Tags for calculating buffs (to damage, cooldown, etc) */
  readonly tags: string[];
  /**
   * Use the skill.
   * Returns any created projectiles or entities.
   */
  readonly use: (user: Player, to: { x: number; y: number }) => PhysicsObject[];
}

export const ACTIVE_SKILLS: { [k: string]: ActiveSkill } = {
  reinforce: {
    name: "Armour Reinforcement",
    // todo: make values display dynamically based on changes
    description:
      "Engage armour reserves, gaining temporary armour up to your maximum armour for 6 seconds",
    cooldown: 24000,
    tags: ["defensive"],
    use: (user: Player) => {
      // set armour to current max armour
      user.tempArmour = calculateFinalStat(
        "armour",
        [],
        user.armour,
        user.statAdjustments
      );
      // add a buff to clean up after 6s
      user.buffs.push({
        name: "Armour Reinforcement",
        remaining: 6000,
        expire: (u: CombatEntity) => {
          // fixme: this shouldn't delete temp armour from other sources
          // temp armour should just be a stat adjustment?
          u.tempArmour = 0;
        },
      });
      return [];
    },
  },
  evasiveManeuvers: {
    name: "Evasive Maneuvers",
    description:
      "Take evasive action, increasing movement speed and avoiding damage from the next 4 collisions or projectiles within 3 seconds.",
    cooldown: 10000,
    tags: ["defensive", "movement"],
    use: (user: Player) => {
      user.buffs.push({
        name: "Evasive Maneuvers",
        stats: {
          // todo: also increase movement speed
          avoidance: {
            projectile: { addition: 1, multiplier: 0 },
            collision: { addition: 1, multiplier: 0 },
          },
        },
        remaining: 3000,
      });
      return [];
    },
  },
  portableWormhole: {
    name: "Portable Wormhole",
    description:
      "Open a wormhole to a location within 500 units, teleporting you there after a brief delay.",
    cooldown: 6000,
    tags: ["movement"],
    use: (user: Player, { x, y }: { x: number; y: number }) => {
      // stop movement
      user.setVelocity(0, 0);
      new Tween(user)
        // Shrink to nothing
        .to({ scale: { x: 0, y: 0 } }, 150)
        .start()
        .onComplete(() => {
          // move
          user.x = x;
          user.y = y;
        })
        .chain(
          // then expand back out
          new Tween(user).to({ scale: { x: 1, y: 1 } }, 150).onComplete(() => {
            // use `setDirectionX` to re-update movement speed based on user input
            user.setDirectionX(user.directionX);
          })
        );
      return [];
    },
  },
};
