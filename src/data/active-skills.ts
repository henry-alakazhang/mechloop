import { PI_2 } from "pixi.js";
import { Tween } from "tweedle.js";
import { SkillTag } from "../scenes/combat/combat.model";
import { CombatEntity } from "../scenes/combat/objects/entity";
import { PhysicsObject } from "../scenes/combat/objects/physics-object";
import { PlayerShip } from "../scenes/combat/objects/player-ship";
import { Projectile } from "../scenes/combat/objects/projectile";

/**
 * Techs, ie. active skills
 *
 * Press a button, get an effect.
 */
export interface ActiveSkill {
  /** Unique id */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description. Should describe what the skill does */
  readonly description: string;
  /** Base time between usages (ms) */
  readonly cooldown: number;
  /** Tags for calculating buffs (to damage, cooldown, etc) */
  readonly tags: SkillTag[];
  /**
   * Use the skill.
   * Returns any created projectiles or entities.
   */
  readonly use: (
    user: PlayerShip,
    to: { x: number; y: number }
  ) => PhysicsObject[];
  /** Enhancements that can modify the behaviour of the skill */
  readonly enhancements?: { [name: string]: ActiveSkillEnhancement };
}

export interface ActiveSkillEnhancement {
  readonly name: string;
  readonly description: string;
}

export const reinforce: ActiveSkill = {
  id: "reinforce",
  name: "Armour Reinforcement",
  // todo: make values display dynamically based on changes
  description:
    "Engage armour reserves, gaining temporary armour up to your maximum armour for 6 seconds",
  cooldown: 24000,
  tags: ["defensive"],
  use: (user: PlayerShip) => {
    // set armour to current max armour
    const initialAmount = user.armour;
    user.armour = user.maxArmour;
    // add a buff to clean up after 6s
    user.buffs.push({
      name: "Armour Reinforcement",
      remaining: 6000,
      expire: (u: CombatEntity) => {
        const remaining = u.armour - initialAmount;

        if (remaining > 0) {
          // if armour is still above initial amount, restore it to initial amount.
          u.armour = initialAmount;

          if (
            u instanceof PlayerShip &&
            u.activeEnhancements.includes("reinforce|expulsion")
          ) {
            // fire off projectiles based on remaining armour, up to 18.
            const count = Math.round((18 * remaining) / u.maxArmour);
            // dealing total damage equal to 3x remaining armour.
            const damage = (3 * remaining) / count;
            u.parent.addChild(
              ...Projectile.shoot({
                owner: u,
                source: { damage, tags: ["kinetic"] } as any,
                from: u.shootBox.getGlobalPosition(),
                to: { x: u.x + 1, y: u.y + 1 },
                count,
                angle: PI_2 / remaining,
                drawProjectile: (g) =>
                  g.beginFill(0xffffff).drawRect(0, -1, 6, 2).endFill(),
              })
            );
          }
        }
      },
    });
    return [];
  },
  enhancements: {
    "reinforce|expulsion": {
      name: "Shedding Expulsion System",
      description:
        "At the end of skill effect, remaining temporary armour is fired off as kinetic projectiles that deal kinetic damage.",
    },
  },
};

export const evasiveManeuvers: ActiveSkill = {
  id: "evasiveManeuvers",
  name: "Evasive Maneuvers",
  description:
    "Take evasive action, increasing movement speed and avoiding damage from the next 4 collisions or projectiles within 3 seconds.",
  cooldown: 10000,
  tags: ["defensive", "movement"],
  use: (user: PlayerShip) => {
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
};

export const portableWormhole: ActiveSkill = {
  id: "portableWormhole",
  name: "Portable Wormhole",
  description:
    "Open a wormhole to a location within 500 units, teleporting you there after a brief delay.",
  cooldown: 6000,
  tags: ["movement"],
  use: (user: PlayerShip, { x, y }: { x: number; y: number }) => {
    // stop movement
    user.setVelocity({ x: 0, y: 0 });
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
};
