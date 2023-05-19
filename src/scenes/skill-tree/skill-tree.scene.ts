import { Container, Graphics, Text } from "pixi.js";
import { PlayerService } from "../../services/player.service";
import { NodeTooltip } from "./objects/node-tooltip";
import { TreeNodeGraphic } from "./objects/tree-node";
import { SkillTree, SkillTreeNode } from "./skill-tree.model";
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
  public connectionGraphics: {
    // for each node, an array of connections
    // each connection consists of two Graphics Objects (both parts of the line)
    [k: string]: [Graphics, Graphics][];
  };

  public tooltip: NodeTooltip;

  public skillPointText: Text;

  treeUpdateListener?: (selectedNodes: SkillTree) => void;

  constructor() {
    super();

    this.tree = tier0;
    this.treeGraphics = {};
    this.connectionGraphics = {};
    this.selected = {
      base: true,
    };

    this.tooltip = new NodeTooltip();
    this.skillPointText = new Text(
      `Skill Points: ${PlayerService.skillPoints.currentValue}`,
      {
        fill: 0xffffff,
        fontFamily: "Courier New",
        fontSize: 15,
      }
    );
    this.skillPointText.x = -this.skillPointText.width / 2;
    this.skillPointText.y = 100;
    this.addChild(this.skillPointText);
    PlayerService.skillPoints.subscribe(
      (points) => (this.skillPointText.text = `Skill Points: ${points}`)
    );

    // Draw background - this is needed so there's a clickable area
    // Otherwise this will inherit the crosshair pointer from the combat scene below.
    const background = this.addChild(
      new Graphics()
        .beginFill(0x000000)
        .drawRoundedRect(-450, -350, 900, 600, 5)
    );
    background.cursor = "default";
    // addChild at the end so it goes into index 0.

    // track max depth so we know how many background layers to draw
    let maxDepth = 0;

    // Skill trees are drawn as an arc with a range of about 120 degrees.
    // Each node on the tree is a `TreeNodeGraphic` object,
    // while the connectors are just haphazardly drawn on later lol.
    this.tree.forEach((skill) => {
      if (skill.depth > maxDepth) {
        maxDepth = skill.depth;
      }

      const currentNode = this.addChild(
        new TreeNodeGraphic({
          node: skill,
          selected: this.selected[skill.id],
        })
      );
      currentNode.interactive = true;
      currentNode.cursor = this.selected[skill.id] ? "default" : "pointer";
      currentNode.on("pointerover", () => {
        this.showTooltip(currentNode);
      });
      currentNode.on("pointerout", () => {
        this.hideTooltip(currentNode);
      });
      // TODO: activate node
      currentNode.on("pointerdown", () => {
        this.toggleAllocation(currentNode);
      });
      this.treeGraphics[skill.id] = currentNode;
      this.connectionGraphics[skill.id] = [];

      // draw connections to connected nodes
      skill.connected.forEach((connectionId) => {
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
          this.selected[connectionId] || this.selected[skill.id] ? 1 : 0.33;

        // draw the vertical connector
        const verticalPath = new Graphics()
          .lineStyle(3, 0xeeeeee)
          // from the bottom of this node
          .moveTo(0, currentNode.verticalPos)
          // to the vertical level of the connected one
          .lineTo(0, connectedNode.verticalPos);
        verticalPath.y = TREE_OFFSET;
        verticalPath.alpha = pathAlpha;
        // rotate to the correct angle
        verticalPath.rotation = currentNode.rotation;

        // then draw an arc
        const arcedPath = new Graphics().lineStyle(3, 0xeeeeee).arc(
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
        arcedPath.alpha = pathAlpha;

        // add to container at index 0 so these paths all go under the nodes themselves
        // note: if this ends up being unperformant, rearrange so the tree nodes get added after
        this.addChildAt(arcedPath, 0);
        this.addChildAt(verticalPath, 0);

        this.connectionGraphics[skill.id].push([verticalPath, arcedPath]);
        this.connectionGraphics[connectionId].push([verticalPath, arcedPath]);
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
    this.addChildAt(background, 0);
  }

  showTooltip(node: TreeNodeGraphic) {
    const position = node.getBounds();
    // Round so the tooltip text isn't blurred by antialiasing
    this.tooltip.x = Math.round(position.right - this.x);
    this.tooltip.y = Math.round(position.bottom - this.y);

    this.tooltip.setNode(node.skillTreeNode);

    this.addChild(this.tooltip);

    if (this.canAllocate(node.skillTreeNode)) {
      // lighten the node a little bit to highlight selectability
      node.cursor = "pointer";
      node.unselectedBG.alpha = 0.2;
    } else {
      node.cursor = "default";
    }
  }

  hideTooltip(node: TreeNodeGraphic) {
    if (this.canAllocate(node.skillTreeNode)) {
      node.unselectedBG.alpha = 0.5;
    }

    this.removeChild(this.tooltip);
  }

  toggleAllocation(node: TreeNodeGraphic) {
    if (!node.selected) {
      // can only allocate if one of the connected nodes is allocated
      // or if there are no prerequisites / connected nodes
      if (this.canAllocate(node.skillTreeNode)) {
        node.selected = true;
        node.cursor = "default";
        this.selected[node.skillTreeNode.id] = true;
        this.connectionGraphics[node.skillTreeNode.id].forEach((connection) => {
          connection[0].alpha = 1;
          connection[1].alpha = 1;
        });
        PlayerService.skillPoints.update((p) => p - 1);
      }
    } else {
      // can only unallocate if all of the connected nodes are still attached to the tree
      // TODO: kind of complicated. unsupported until then.
    }

    // update any listeners with all allocated skill nodes
    this.treeUpdateListener?.(
      this.tree.filter((node) => this.selected[node.id])
    );
  }

  canAllocate(skillTreeNode: SkillTreeNode): boolean {
    return (
      // have skill points
      PlayerService.skillPoints.currentValue > 0 &&
      // node isn't allocated
      !this.selected[skillTreeNode.id] &&
      // node either has no prerequisites, or its prerequisites are allocated
      (skillTreeNode.connected.length === 0 ||
        skillTreeNode.connected.some(
          (connectedNode) => this.selected[connectedNode]
        ))
    );
  }

  /**
   * Add an event listener for updates to the tree and selected nodes
   */
  onTreeUpdate(listener: (selectedNodes: SkillTree) => void): this {
    this.treeUpdateListener = listener;

    // immediately call it to update with the initial state.
    // fixme: shouldn't need this; the tree state should be handled at a higher level.
    listener(this.tree.filter((node) => this.selected[node.id]));
    return this;
  }
}
