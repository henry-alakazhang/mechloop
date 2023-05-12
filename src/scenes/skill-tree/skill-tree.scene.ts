import { Container, Graphics } from "pixi.js";
import { SkillTree } from "./skill-tree.model";
import { tier0 } from "./trees/tier-0-ship";

/**
 * This offset is used to shift the entire graphic to the outside of the arc,
 * making the whole shape a lot shallower, rather than being a semicircle.
 */
const TREE_OFFSET = 200;
/**
 * The height of each layer in the tree (each arc).
 */
const LAYER_HEIGHT = 80;

export class SkillTreeScene extends Container {
  public tree: SkillTree;
  public selected: { [k: string]: boolean };

  public treeGraphics: { [k: string]: Graphics };

  constructor() {
    super();

    this.tree = tier0;
    this.treeGraphics = {};
    this.selected = {};

    let maxDepth = 0;

    // Passive trees are drawn as an arc with a range of about 120 degrees.
    this.tree.forEach((passive) => {
      if (passive.depth > maxDepth) {
        maxDepth = passive.depth;
      }

      const colour =
        passive.colour === "r"
          ? 0x993366
          : passive.colour === "g"
          ? 0x669933
          : passive.colour === "b"
          ? 0x336699
          : 0xffffff;
      const fill =
        passive.colour === "r"
          ? 0xd05090
          : passive.colour === "g"
          ? 0x90d050
          : passive.colour === "b"
          ? 0x5090d0
          : 0xffffff;
      const node = new Graphics().lineStyle(3, colour).beginFill(fill);

      node.y = TREE_OFFSET;
      // Nodes are pushed further back based on their depth; deeper nodes are further up.
      // the offset is subtracted here so that the nodes are still located
      // close to the middle of the skill tree container itself
      const verticalPos = -passive.depth * LAYER_HEIGHT - node.y;
      // Then nodes are rotated, around the original centerpoint
      // ie. this moves them left and righ across the arc.
      node.angle = passive.index * 12;
      // Now draw the element at the appropriate position
      switch (passive.type) {
        case "passive":
          node.drawCircle(0, verticalPos, 20);
          break;
        case "class":
          node.drawCircle(0, verticalPos, 30);
          break;
        case "weapon":
        case "tech":
          node.drawRoundedRect(-20, -20 + verticalPos, 40, 40, 2);
          break;
      }
      // TODO: display tooltip with name/description
      node.on("pointerover", () => {});
      // TODO: activate node
      node.on("pointerdown", () => {});
      this.addChild(node);
      this.treeGraphics[passive.id] = node;

      passive.connected.forEach((connected) => {
        const connectedNode = this.treeGraphics[connected];
        if (!connectedNode) {
          return;
        }

        const arcedPath = new Graphics()
          .lineStyle(3, 0xeeeeee)
          .arc(
            0,
            0,
            verticalPos + LAYER_HEIGHT,
            node.rotation + Math.PI / 2,
            connectedNode.rotation + Math.PI / 2,
            node.rotation > connectedNode.rotation
          );
        arcedPath.y = TREE_OFFSET;
        const verticalPath = new Graphics()
          .lineStyle(3, 0xeeeeee)
          .moveTo(0, verticalPos)
          // TODO: don't hardcode the height here (it should be based off vertical position of other node)
          .lineTo(0, verticalPos + LAYER_HEIGHT + 1);
        verticalPath.y = TREE_OFFSET;
        verticalPath.rotation = node.rotation;
        // add to container at index 0 so these paths all go under the nodes themselves
        // note: if this ends up being unperformant, rearrange so the tree nodes get added after
        this.addChildAt(arcedPath, 0);
        this.addChildAt(verticalPath, 0);
      });
    });

    // Finally, draw in the background layers of the tree
    const layerBorders = new Graphics();
    for (let layer = 0; layer <= maxDepth; layer++) {
      // we have to make a new arc each time because otherwise there's a line between the two
      // TODO: figure out how to not do that lol?
      layerBorders.addChild(
        // each layer is an increasingly dark steel-grey-ish colour (lighter at the bottom)
        new Graphics().lineStyle(LAYER_HEIGHT, 0xaabbcc - 0x111111 * layer).arc(
          0,
          0,
          TREE_OFFSET + layer * LAYER_HEIGHT + 1,
          // 0.5 radians is 30 degrees off horizontal; ie. the full arc is 120 degrees
          Math.PI + 0.5,
          -0.5,
          false
        )
      );
    }
    layerBorders.y = TREE_OFFSET;
    // layerBorders.visible = false;
    this.addChildAt(layerBorders, 0);
  }
}
