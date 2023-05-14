import { Tween } from "tweedle.js";
import { PhysicsObject } from "../objects/physics-object";
import { Player } from "../objects/player";

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
      "Engage armour reserves, restoring all armour for 4 seconds. For the duration, also increase armour effect by 50%",
    cooldown: 15000,
    tags: ["defensive"],
    use: () => {
      console.log("Armour Reinforcement");
      // todo: implement
      return [];
    },
  },
  evasiveManeuvers: {
    name: "Evasive Maneuvers",
    description:
      "Take evasive action, increasing movement speed and avoiding damage from the next 4 collisions or projectiles within 3 seconds.",
    cooldown: 10000,
    tags: ["defensive", "movement"],
    use: (user: Player, { x, y }: { x: number; y: number }) => {
      user.temporaryStatAdjustments.push({
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
