import { Weapon } from "../../data/weapons";
import { StatAdjustments } from "../combat/combat.model";

/**
 * A node on a skill tree.
 *
 * Trees are displayed in an arc shape, with a root node at the bottom
 * and branches extendout outwards horizontally and upwards vertically.
 *
 * A node can be activated if any of its connected nodes are activated
 */
export interface BaseSkillTreeNode {
  /** Unique identifier for the node */
  readonly id: string;
  /** Connected (prerequisite) nodes on the skill tree */
  readonly connected: string[];
  /** Vertical depth for display. Starts at 0 and goes up. */
  readonly depth: number;
  /** Horizontal index for display. 0 is vertical, negative goes left and positive goes right. */
  readonly index: number;
  /** Display icon */
  readonly iconUrl?: string;
  /** Colour of border. */
  readonly colour?: "r" | "g" | "b";
  /** Type of node - changes size, shape and functionality. */
  readonly type: "passive" | "weapon" | "tech" | "class";
}

export interface PassiveNode extends BaseSkillTreeNode {
  readonly type: "passive";
  /** Display name */
  readonly name: string;
  readonly statAdjustments: StatAdjustments;
}

export interface WeaponNode extends BaseSkillTreeNode {
  readonly type: "weapon";
  readonly weapon: Weapon;
}

export interface TechNode extends BaseSkillTreeNode {
  readonly type: "tech";
  // TODO: implement
}

export interface ClassNode extends BaseSkillTreeNode {
  readonly type: "class";
  // TODO: implement
}

export type SkillTreeNode = PassiveNode | WeaponNode | TechNode | ClassNode;

export type SkillTree = SkillTreeNode[];
