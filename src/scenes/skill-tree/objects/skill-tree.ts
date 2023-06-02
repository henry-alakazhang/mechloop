import { Container, Graphics, Text } from "pixi.js";
import { PlayerService } from "../../../services/player.service";
import { SkillTree } from "../skill-tree.model";
import { NodeTooltip } from "./node-tooltip";
import { TreeNodeGraphic } from "./tree-node";

interface SkillTreeSceneConfig {
  tree: SkillTree;
}

/**
 * This offset is used to shift the entire graphic to the outside of the arc,
 * making the whole shape a lot shallower, rather than being a semicircle.
 */
export const TREE_OFFSET = 200;
/**
 * Position of the tree within the scene
 * Shifted down slightly to better center it within the scene.
 */
export const TREE_POSITION = TREE_OFFSET + 50;
/**
 * The height of each layer in the tree (each arc).
 */
export const LAYER_HEIGHT = 80;

export const TREE_WIDTH = 990;
export const TREE_HEIGHT = 660;

/**
 * Representation of a skill tree which can be used to allocate skill points.
 *
 * Origin (0,0) is in the center of the skill tree area
 */
export class SkillTreeObject extends Container {
  public tree: SkillTree;

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

  constructor({ tree }: SkillTreeSceneConfig) {
    super();

    this.tree = tree;
    this.treeGraphics = {};
    this.connectionGraphics = {};

    this.tooltip = new NodeTooltip();
    this.skillPointText = new Text(
      `Skill Points: ${PlayerService.skillPoints.currentValue}`,
      {
        fill: 0xffffff,
        fontFamily: "Courier New",
        fontSize: 15,
      }
    );
    this.skillPointText.x = Math.round(-this.skillPointText.width / 2);
    this.skillPointText.y = 150;
    this.addChild(this.skillPointText);
    PlayerService.skillPoints.subscribe(
      (points) => (this.skillPointText.text = `Skill Points: ${points}`)
    );
    // update various visual states on node selection
    PlayerService.allocatedNodes.subscribe((nodes) => {
      Object.keys(nodes).forEach((id) => {
        // fixme: this iterates over every allocated node for every tree
        // seems a bit inefficient
        if (id in this.treeGraphics) {
          this.treeGraphics[id].selected = true;
          this.treeGraphics[id].cursor = "default";
          this.connectionGraphics[id].forEach((connection) => {
            connection[0].alpha = 1;
            connection[1].alpha = 1;
          });
        }
      });
    });

    // Draw background - this is needed so there's a clickable area
    // Otherwise this will inherit the crosshair pointer from the combat scene below.
    const background = this.addChild(
      new Graphics()
        .beginFill(0x100010)
        .drawRoundedRect(
          -TREE_WIDTH / 2,
          -TREE_HEIGHT / 2,
          TREE_WIDTH,
          TREE_HEIGHT,
          5
        )
        .endFill()
    );
    background.cursor = "default";
    // addChild at the end so it goes into index 0.

    // track max depth so we know how many background layers to draw
    let maxDepth = 0;
    const selected = PlayerService.allocatedNodes.currentValue;

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
          selected: skill.id in selected,
        })
      );
      currentNode.y = TREE_POSITION;
      currentNode.interactive = true;
      currentNode.cursor = selected[skill.id] ? "default" : "pointer";
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
          selected[connectionId] || selected[skill.id] ? 1 : 0.33;

        // draw the vertical connector
        const verticalPath = new Graphics()
          .lineStyle(3, 0xeeeeee)
          // from the bottom of this node
          .moveTo(0, currentNode.verticalPos)
          // to the vertical level of the connected one
          .lineTo(0, connectedNode.verticalPos);
        verticalPath.y = TREE_POSITION;
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
        arcedPath.y = TREE_POSITION;
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
    layerBorders.y = TREE_POSITION;
    // layerBorders.visible = false;
    this.addChildAt(layerBorders, 0);
    this.addChildAt(background, 0);
  }

  showTooltip(node: TreeNodeGraphic) {
    // the tree nodes are rotated and shifted, so their `position` isn't where they're displayed.
    // we need to calculate relative location based off their global bounds and this scene's location.
    const nodePos = node.getBounds();
    const thisPos = this.getGlobalPosition();
    // global node position - global scene position = relative node position
    this.tooltip.x = Math.round(nodePos.right - thisPos.x);
    this.tooltip.y = Math.round(nodePos.bottom - thisPos.y);

    this.tooltip.setNode(node.skillTreeNode);

    this.addChild(this.tooltip);

    if (PlayerService.canAllocate(node.skillTreeNode)) {
      // lighten the node a little bit to highlight selectability
      node.cursor = "pointer";
      node.unselectedBG.alpha = 0.2;
    } else {
      node.cursor = "default";
    }
  }

  hideTooltip(node: TreeNodeGraphic) {
    if (PlayerService.canAllocate(node.skillTreeNode)) {
      node.unselectedBG.alpha = 0.5;
    }

    this.removeChild(this.tooltip);
  }

  toggleAllocation(node: TreeNodeGraphic) {
    if (!node.selected) {
      if (PlayerService.canAllocate(node.skillTreeNode)) {
        PlayerService.allocateNode(node.skillTreeNode);
      }
    } else {
      // can only unallocate if all of the connected nodes are still attached to the tree
      // TODO: kind of complicated. unsupported until then.
    }
  }
}
