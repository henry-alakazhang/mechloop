import { Observable } from "../util/observable";

/**
 * Global singleton service for tracking and maintaining player state,
 * shared across all the game's scenes.
 *
 * Implementation-wise, this could use some kind of singleton `instance`
 * but just using a bunch of global static vars is kinda easier lol.
 *
 * man, having Signals would be quite nice for data transfer here...
 */
export class PlayerService {
  /**
   * The amount of unallocated skill points the player has.
   */
  public static skillPoints = new Observable(0);

  // todo: some skill tree state (tree id -> allocated passives?)

  /**
   * Allocated skill tree nodes
   */
  // public static selectedNodes = new Observable(???);
}
