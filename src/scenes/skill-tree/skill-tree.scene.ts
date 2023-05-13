import { Container, Graphics } from "pixi.js";
import { TreeNodeGraphic } from "./objects/tree-node";
import { SkillTree } from "./skill-tree.model";
import { tier0 } from "./trees/tier-0-ship";

/**
 * This offset is used to shift the entire graphic to the outside of the arc,
 * making the whole shape a lot shallower, rather than being a semicircle.
 */
export const TREE_OFFSET = 200;
/**
 * The height of each layer in the tree (each arc).
 */
export const LAYER_HEIGHT = 80;

export class SkillTreeScene extends Container {
  public tree: SkillTree;
  public selected: { [k: string]: boolean };

  public treeGraphics: {
    [k: string]: TreeNodeGraphic;
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
    // Each node on the tree is a `TreeNodeGraphic` object,
    // while the connectors are just haphazardly drawn on later lol.
    this.tree.forEach((passive) => {
      if (passive.depth > maxDepth) {
        maxDepth = passive.depth;
      }

      const currentNode = this.addChild(
        new TreeNodeGraphic({
          node: passive,
          selected: this.selected[passive.id],
        })
      );
      // TODO: display tooltip with name/description
      currentNode.on("pointerover", () => {});
      // TODO: activate node
      currentNode.on("pointerdown", () => {});
      this.treeGraphics[passive.id] = currentNode;

      // draw connections to connected nodes
      passive.connected.forEach((connectionId) => {
        // draw if we've already created the connected node.
        // this guarantees ordering (always draws from the higher node)
        // and it guarantees each connection is only drawn once.
        const connectedNode = this.treeGraphics[connectionId];
        if (!connectedNode) {
          return;
        }

        // if either node is selected, path should be full brightness
        // otherwise it should be a bit faded.
        // todo: maybe do this with a dotted line instead
        // but there's no builtin pixi support and i'm lazy
        const pathAlpha =
          this.selected[connectionId] || this.selected[passive.id] ? 1 : 0.33;

        // draw the vertical connector
        const verticalPath = new Graphics()
          .lineStyle(3, 0xeeeeee, pathAlpha)
          // from the bottom of this node
          .moveTo(0, currentNode.verticalPos)
          // to the vertical level of the connected one
          .lineTo(0, connectedNode.verticalPos);
        verticalPath.y = TREE_OFFSET;
        // rotate to the correct angle
        verticalPath.rotation = currentNode.rotation;

        // then draw an arc
        const arcedPath = new Graphics().lineStyle(3, 0xeeeeee, pathAlpha).arc(
          0,
          0,
          // at the height of the other node
          connectedNode.verticalPos,
          // across the distance between the two nodes
          currentNode.rotation + Math.PI / 2,
          connectedNode.rotation + Math.PI / 2,
          // switch direction depending on how it needs to work.
          currentNode.rotation > connectedNode.rotation
        );
        arcedPath.y = TREE_OFFSET;

        // add to container at index 0 so these paths all go under the nodes themselves
        // note: if this ends up being unperformant, rearrange so the tree nodes get added after
        this.addChildAt(arcedPath, 0);
        this.addChildAt(verticalPath, 0);
      });
    });

    // Draw in the background layers of the tree.
    // We do this last so that it will  be furthest to the back.
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
