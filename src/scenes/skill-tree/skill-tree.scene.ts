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
/**
 * Radius of an individual tree node (half of the height for non-circle nodes)
 */
const NODE_RADIUS = 20;
/**
 * Radius of the unselected grey-out overlay node.
 *
 * Ideally I could just draw the same circle with the same border,
 * but having alpha on both `line` and `fill` causes their overlap
 * to be extra dark, which looks weird.
 */
const BG_NODE_RADIUS = NODE_RADIUS + 2;

export class SkillTreeScene extends Container {
  public tree: SkillTree;
  public selected: { [k: string]: boolean };

  public treeGraphics: {
    [k: string]: { node: Graphics; unselectedBG: Graphics };
  };

  constructor() {
    super();

    this.tree = tier0;
    this.treeGraphics = {};
    this.selected = {
      ship: true,
      "red-1": true,
      "green-1": true,
      "blue-1": true,
    };

    let maxDepth = 0;

    // Passive trees are drawn as an arc with a range of about 120 degrees.
    this.tree.forEach((passive) => {
      if (passive.depth > maxDepth) {
        maxDepth = passive.depth;
      }

      const border =
        passive.colour === "r"
          ? 0x993366
          : passive.colour === "g"
          ? // use a darker green because the same shade as red/blue seems weirdly lighter
            0x558822
          : passive.colour === "b"
          ? 0x336699
          : 0xaaaaaa;
      const fill =
        passive.colour === "r"
          ? 0xe070b0
          : passive.colour === "g"
          ? 0xa0d060
          : passive.colour === "b"
          ? 0x70b0e0
          : 0xffffff;
      const node = new Graphics().lineStyle(4, border).beginFill(fill);
      let unselectedBG = node.addChild(new Graphics().beginFill(0x777777));
      unselectedBG.alpha = 0.5;
      if (this.selected[passive.id]) {
        unselectedBG.visible = false;
      }

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
          node.drawCircle(0, verticalPos, NODE_RADIUS);
          unselectedBG?.drawCircle(0, verticalPos, BG_NODE_RADIUS);
          break;
        case "class":
          node.drawCircle(0, verticalPos, NODE_RADIUS + 5);
          unselectedBG?.drawCircle(0, verticalPos, BG_NODE_RADIUS + 5);
          break;
        case "weapon":
        case "tech":
          node.drawRoundedRect(
            -NODE_RADIUS,
            -NODE_RADIUS + verticalPos,
            NODE_RADIUS * 2,
            NODE_RADIUS * 2,
            2
          );
          unselectedBG?.drawRoundedRect(
            -BG_NODE_RADIUS,
            -BG_NODE_RADIUS + verticalPos,
            BG_NODE_RADIUS * 2,
            BG_NODE_RADIUS * 2,
            2
          );
          break;
      }
      // TODO: display tooltip with name/description
      node.on("pointerover", () => {});
      // TODO: activate node
      node.on("pointerdown", () => {});
      this.addChild(node);
      this.treeGraphics[passive.id] = { node, unselectedBG };

      passive.connected.forEach((connectionId) => {
        const connectedNode = this.treeGraphics[connectionId].node;
        if (!connectedNode) {
          return;
        }

        // if either node is selected, path should be full brightness
        // otherwise it should be a bit faded.
        // todo: maybe do this with a dotted line instead
        // but there's no builtin pixi support and i'm lazy
        const pathAlpha =
          this.selected[connectionId] || this.selected[passive.id] ? 1 : 0.33;

        const arcedPath = new Graphics()
          .lineStyle(3, 0xeeeeee, pathAlpha)
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
          .lineStyle(3, 0xeeeeee, pathAlpha)
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
