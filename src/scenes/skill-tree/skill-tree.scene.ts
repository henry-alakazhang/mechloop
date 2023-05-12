import { Container, Graphics } from "pixi.js";
import { SkillTree } from "./skill-tree.model";

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

    this.tree = [
      {
        id: "journeyman",
        connected: [],
        depth: 0,
        index: 0,
        name: "JOURNEYMAN-class Frigate",
        type: "class",
      },
      {
        id: "journeyman-red-1",
        connected: ["journeyman"],
        depth: 1,
        index: -3,
        name: "+10 Maximum HP; +2 Global Damage",
        type: "passive",
        colour: "r",
        statAdjustments: { damage: { global: { addition: 2, multiplier: 0 } } },
      },
      {
        id: "journeyman-red-2-defensive",
        connected: ["journeyman-red-1"],
        depth: 2,
        index: -4,
        name: "+15 Armour",
        type: "passive",
        colour: "r",
        // TODO: implement
        statAdjustments: {},
      },
      {
        id: "journeyman-red-2-offensive",
        connected: ["journeyman-red-1"],
        depth: 2,
        index: -2,
        name: "+15% Global Damage",
        type: "passive",
        colour: "r",
        statAdjustments: {
          damage: { global: { addition: 0, multiplier: 0.15 } },
        },
      },
      {
        id: "journeyman-red-capstone",
        connected: ["journeyman-red-2-defensive", "journeyman-red-2-offensive"],
        depth: 3,
        index: -3,
        name: "Rapid Armour Calibration",
        type: "tech",
        colour: "r",
        // TODO: implement
      },
      {
        id: "journeyman-green-1",
        connected: ["journeyman"],
        depth: 1,
        index: 0,
        name: "+10 Maximum HP; +10% Critical Strike Chance",
        type: "passive",
        colour: "g",
        statAdjustments: {
          critChance: { global: { addition: 0.1, multiplier: 0 } },
        },
      },
      {
        id: "journeyman-green-2-defensive",
        connected: ["journeyman-green-1"],
        depth: 2,
        index: -1,
        name: "+15% Evade Chance",
        type: "passive",
        colour: "g",
        // TODO: implement
        statAdjustments: {},
      },
      {
        id: "journeyman-green-2-offensive",
        connected: ["journeyman-green-1"],
        depth: 2,
        index: 1,
        name: "+15% Rate of Fire",
        type: "passive",
        colour: "g",
        statAdjustments: {
          rof: { global: { addition: 0, multiplier: 0.15 } },
        },
      },
      {
        id: "journeyman-green-capstone",
        connected: [
          "journeyman-green-2-defensive",
          "journeyman-green-2-offensive",
        ],
        depth: 3,
        index: 0,
        name: "Phase Shift",
        type: "tech",
        colour: "g",
        // TODO: implement
      },
      {
        id: "journeyman-blue-1",
        connected: ["journeyman"],
        depth: 1,
        index: 3,
        name: "+10 Maximum HP; +10% Area of Effect",
        type: "passive",
        colour: "b",
        // TODO: implement
        statAdjustments: {},
      },
      {
        id: "journeyman-blue-2-defensive",
        connected: ["journeyman-blue-1"],
        depth: 2,
        index: 2,
        name: "+15 Shields",
        type: "passive",
        colour: "b",
        // TODO: implement
        statAdjustments: {},
      },
      {
        id: "journeyman-blue-2-offensive",
        connected: ["journeyman-blue-1"],
        depth: 2,
        index: 4,
        name: "+15% Tech Recovery",
        type: "passive",
        colour: "b",
        // TODO: implement
        statAdjustments: {},
      },
      {
        id: "journeyman-blue-capstone",
        connected: [
          "journeyman-blue-2-defensive",
          "journeyman-blue-2-offensive",
        ],
        depth: 3,
        index: 3,
        name: "Short-Range Electomagnetic Pulse",
        type: "tech",
        colour: "b",
        // TODO: implement
      },
    ];
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
