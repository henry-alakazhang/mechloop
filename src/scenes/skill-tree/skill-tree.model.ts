import { Weapon } from "../../data/weapons";
import { StatAdjustments } from "../combat/combat.model";

export interface PassiveNode {
  /** Unique identifier for the passive node */
  readonly id: string;
  /** Connected passive nodes on the skill tree */
  readonly connected: string[];
  /** Coordinate x to render (within parent) */
  readonly x: number;
  /** Coordinate y to render (within parent) */
  readonly y: number;
  /** Display name */
  readonly name: string;
  /** Display icon */
  readonly iconUrl?: string;
  /** Stat adjustments applied by the node (if applicable) */
  readonly statAdjustments?: StatAdjustments;
  /** Weapon granted by the node (if applicable) */
  readonly weapon?: Weapon;
}
