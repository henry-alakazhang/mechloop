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
    use: () => {
      console.log("Evasive Maneuvers");
      // todo: implement
      return [];
    },
  },
  portableWormhole: {
    name: "Portable Wormhole",
    description:
      "Open a wormhole to a location within 500 units, teleporting you there after a brief delay.",
    cooldown: 9000,
    tags: ["movement"],
    use: () => {
      console.log("Portable Wormhole");
      // todo: implement
      return [];
    },
  },
};
