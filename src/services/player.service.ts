import { SkillTreeNode } from "../scenes/skill-tree/skill-tree.model";
import { Observable } from "../util/observable";

/**
 * Global singleton service for tracking and maintaining player state,
 * shared across all the game's scenes.
 *
 * Implementation-wise, this could use some kind of singleton `instance`
 * but just using a bunch of global static vars is kinda easier lol.
 */
export class PlayerService {
  /**
   * The amount of unallocated skill points the player has.
   */
  public static skillPoints = new Observable(0);

  /**
   * A map of allocated nodes in all skill trees.
   * Will only ever have allocated nodes as keys, so is safe to iterate over.
   */
  public static allocatedNodes = new Observable<{ [k: string]: true }>({
    base: true,
  });
  public static activatedTrees = new Observable<{ [k: string]: true }>({});

  public static allocateNode(nodeId: string) {
    if (this.skillPoints.currentValue >= 0) {
      this.skillPoints.update((p) => p - 1);
      this.allocatedNodes.update((state) => {
        state[nodeId] = true;
        return state;
      });
    }
  }

  public static canAllocate(skillTreeNode: SkillTreeNode): boolean {
    return (
      // have skill points
      this.skillPoints.currentValue > 0 &&
      // node isn't allocated
      !this.allocatedNodes.currentValue[skillTreeNode.id] &&
      // node either has no prerequisites, or its prerequisites are allocated
      (skillTreeNode.connected.length === 0 ||
        skillTreeNode.connected.some(
          (connectedNode) => this.allocatedNodes.currentValue[connectedNode]
        ))
    );
  }

  // todo: some skill tree state (tree id -> allocated passives?)

  /**
   * Allocated skill tree nodes
   */
  // public static selectedNodes = new Observable(???);
}
