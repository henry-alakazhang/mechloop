import { Graphics } from "pixi.js";
import { SkillTreeNode } from "../skill-tree.model";
import { LAYER_HEIGHT, TREE_OFFSET } from "../skill-tree.scene";

interface TreeNodeConfig {
  readonly node: SkillTreeNode;
  readonly selected: boolean;
}

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

export class TreeNodeGraphic extends Graphics {
  public graphic: Graphics;
  public skillTreeNode: SkillTreeNode;
  public selected: boolean;

  public verticalPos: number;

  constructor({ node, selected }: TreeNodeConfig) {
    super();

    this.skillTreeNode = node;
    this.selected = selected;

    const border =
      node.colour === "r"
        ? 0x993366
        : node.colour === "g"
        ? // use a darker green because the same shade as red/blue seems weirdly lighter
          0x558822
        : node.colour === "b"
        ? 0x336699
        : 0xaaaaaa;
    const fill =
      node.colour === "r"
        ? 0xe070b0
        : node.colour === "g"
        ? 0xa0d060
        : node.colour === "b"
        ? 0x70b0e0
        : 0xffffff;
    this.graphic = this.addChild(
      new Graphics().lineStyle(4, border).beginFill(fill)
    );
    let unselectedBG = this.graphic.addChild(
      new Graphics().beginFill(0x777777)
    );
    unselectedBG.alpha = 0.5;
    if (selected) {
      unselectedBG.visible = false;
    }

    // node: the following values/transforms are applied to this TreeNodeGraphic object itself
    // so that they can be more easily accessed externally (eg. in the SkillTree)
    this.y = TREE_OFFSET;
    // Nodes are pushed further back based on their depth; deeper nodes are further up.
    // the offset is subtracted here so that the nodes are still located
    // close to the middle of the skill tree container itself
    this.verticalPos = -node.depth * LAYER_HEIGHT - TREE_OFFSET;
    // Then nodes are rotated, around the original centerpoint
    // ie. this moves them left and righ across the arc.
    this.angle = node.index * 12;
    // Now draw the element at the appropriate position
    switch (node.type) {
      case "passive":
        this.graphic.drawCircle(0, this.verticalPos, NODE_RADIUS);
        unselectedBG?.drawCircle(0, this.verticalPos, BG_NODE_RADIUS);
        break;
      case "class":
        this.graphic.drawCircle(0, this.verticalPos, NODE_RADIUS + 5);
        unselectedBG?.drawCircle(0, this.verticalPos, BG_NODE_RADIUS + 5);
        break;
      case "weapon":
      case "tech":
        this.graphic.drawRoundedRect(
          -NODE_RADIUS,
          -NODE_RADIUS + this.verticalPos,
          NODE_RADIUS * 2,
          NODE_RADIUS * 2,
          2
        );
        unselectedBG?.drawRoundedRect(
          -BG_NODE_RADIUS,
          -BG_NODE_RADIUS + this.verticalPos,
          BG_NODE_RADIUS * 2,
          BG_NODE_RADIUS * 2,
          2
        );
        break;
    }
  }
}
