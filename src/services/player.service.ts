import { SkillId, SkillTreeNode } from "../scenes/skill-tree/skill-tree.model";
import { tier0 } from "../scenes/skill-tree/trees";
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
   * A map of allocated nodes in all skill trees, mapping ID to the node itself.
   * Will only ever have allocated nodes as keys/values, so is safe to iterate over.
   */
  public static allocatedNodes = new Observable<{
    [k: SkillId]: SkillTreeNode;
  }>({
    // first node of tier 0 always allocated
    [tier0[0].id]: tier0[0],
  });
  public static activatedTrees = new Observable<{ [k: string]: true }>({});

  public static allocateNode(node: SkillTreeNode) {
    if (this.skillPoints.currentValue >= 0) {
      this.skillPoints.update((p) => p - 1);
      this.allocatedNodes.update((state) => {
        state[node.id] = node;
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
