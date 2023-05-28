import { ActiveSkill } from "../../data/active-skills";
import { Weapon } from "../../data/weapons";
import { Condition, StatAdjustments } from "../combat/combat.model";

/** Class IDs. Need to be `tN-<identifier>` */
export type ClassId = `t${number}-${string}`;
/** Skill IDs. Need to be <classId>|<identifier> */
export type SkillId = `${ClassId}|${string}`;

/**
 * A node on a skill tree.
 *
 * Trees are displayed in an arc shape, with a root node at the bottom
 * and branches extendout outwards horizontally and upwards vertically.
 *
 * A node can be activated if any of its connected nodes are activated
 */
export interface BaseSkillTreeNode {
  /** Identifier for the node. Prepended with class ID and has to be unique across all skill trees. */
  readonly id: SkillId;
  /**
   * Prerequisite nodes on the skill tree.
   * Nodes in the same tree will be connected by a line.
   * Nodes in different trees will not (obviously)
   */
  readonly connected: SkillId[];
  /** Vertical depth for display. Starts at 0 and goes up. */
  readonly depth: number;
  /** Horizontal index for display. 0 is vertical, negative goes left and positive goes right. */
  readonly index: number;
  /** Display icon */
  readonly iconUrl?: string;
  /** Colour of border. */
  readonly colour?: "r" | "g" | "b";
  /** Type of node - changes size, shape and functionality. */
  readonly type: "passive" | "conditionalPassive" | "weapon" | "tech" | "class";
}

export interface PassiveNode extends BaseSkillTreeNode {
  readonly type: "passive";
  /** Display name */
  readonly name: string;
  readonly statAdjustments: StatAdjustments;
}

export interface ConditionalPassiveNode extends BaseSkillTreeNode {
  readonly type: "conditionalPassive";
  /** Display name */
  readonly name: string;
  readonly statAdjustments: StatAdjustments;
  readonly condition: Condition;
}

export interface WeaponNode extends BaseSkillTreeNode {
  readonly type: "weapon";
  readonly weapon: Weapon;
}

export interface TechNode extends BaseSkillTreeNode {
  readonly type: "tech";
  readonly tech: ActiveSkill;
}

export interface ClassNode extends BaseSkillTreeNode {
  readonly type: "class";
  // TODO: implement
}

export type SkillTreeNode =
  | PassiveNode
  | ConditionalPassiveNode
  | WeaponNode
  | TechNode
  | ClassNode;

export type SkillTree = SkillTreeNode[];

export interface Class {
  readonly id: ClassId;
  readonly name: string;
  readonly description: string;
  readonly skillTree: SkillTree;
  readonly prerequisites?: {
    readonly r?: number;
    readonly g?: number;
    readonly b?: number;
  };
}
