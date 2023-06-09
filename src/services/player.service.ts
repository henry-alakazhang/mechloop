import {
  Class,
  SkillId,
  SkillTreeNode,
} from "../scenes/skill-tree/skill-tree.model";
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
  public static skillPoints = new Observable(20);

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

  /**
   * A mapping of all nodes connected to nodes that have been allocated.
   * This allows for traversing either direction along the skill tree,
   * without having to duplicate the connection data in the trees themselves.
   */
  public static connectedNodes: { [k: SkillId]: unknown } = {};

  public static allocateNode(node: SkillTreeNode) {
    if (this.skillPoints.currentValue >= 0) {
      this.skillPoints.update((p) => p - 1);
      this.allocatedNodes.update((state) => {
        state[node.id] = node;
        return state;
      });
      // mark all connected nodes as available
      node.connected.forEach((connection) => {
        this.connectedNodes[connection] = true;
      });
    }
  }

  public static canAllocate(skillTreeNode: SkillTreeNode): boolean {
    return (
      // have skill points
      this.skillPoints.currentValue > 0 &&
      // and node isn't allocated
      !this.allocatedNodes.currentValue[skillTreeNode.id] &&
      // and node either: has no prerequisites
      (skillTreeNode.connected.length === 0 ||
        // or its prerequisites are allocated
        skillTreeNode.connected.some(
          (connectedNode) => this.allocatedNodes.currentValue[connectedNode]
        ) ||
        // or it itself is the "prerequisite" of an already-allocated node
        skillTreeNode.id in this.connectedNodes)
    );
  }

  public static canAllocateClass(c: Class): boolean {
    if (!c.prerequisites) {
      return true;
    }

    // calculate total ratings by summing up colours from allocated nodes
    // TODO: maybe inefficient to do every time we call this function?
    const ratings = Object.values(this.allocatedNodes.currentValue).reduce(
      (total, allocatedNode) => {
        if (allocatedNode.colour) {
          return {
            ...total,
            [allocatedNode.colour]: total[allocatedNode.colour] + 1,
          };
        }
        return total;
      },
      { r: 0, g: 0, b: 0 }
    );
    return (
      // all valid prerequisites are met
      ratings.r >= (c.prerequisites.r ?? 0) &&
      ratings.g >= (c.prerequisites.g ?? 0) &&
      ratings.b >= (c.prerequisites.b ?? 0)
    );
  }
}
