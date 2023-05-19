import { Container, Graphics, Text } from "pixi.js";
import { getAdjustmentDescriptions } from "../../combat/combat.model";
import { SkillTreeNode } from "../skill-tree.model";

/**
 * A tooltip used to display information about a skill tree node.
 *
 * This should usually be a singleton for performance reasons;
 * just move it around to wherever it needs to be.
 *
 * Origin (0,0) is the top-left of the tooltip.
 * As such, best usage is usually to move it to the bottom-right of whatever
 * you want to have the tooltip placed over.
 *
 * TODO: switch this over to a HTML-based tooltip?
 * it's currently ugly as sin and I don't really want to
 * design a nice text-based interface using Pixi objects...
 */
export class NodeTooltip extends Container {
  public node?: SkillTreeNode;

  private background: Graphics;
  private titleText: Text;
  private descriptionText: Text;

  constructor() {
    super();

    this.background = this.addChild(
      new Graphics()
        .lineStyle(2, 0x000000)
        .beginFill(0xeeeeee)
        .drawRoundedRect(0, 0, 350, 80, 2)
    );
    this.titleText = this.addChild(
      new Text("", {
        fontSize: 16,
        fontFamily: "Courier New",
        fontWeight: "bold",
        padding: 5,
      })
    );
    this.titleText.x = 5;
    this.titleText.y = 5;
    this.descriptionText = this.addChild(
      new Text("", {
        fontSize: 14,
        fontFamily: "Courier New",
        wordWrap: true,
        wordWrapWidth: 340,
      })
    );
    this.descriptionText.x = 5;
    this.descriptionText.y = 25;
  }

  setNode(node: SkillTreeNode) {
    switch (node.type) {
      case "passive":
        this.titleText.text = node.name;
        this.descriptionText.text = getAdjustmentDescriptions(
          node.statAdjustments
        );
        break;
      case "weapon":
        this.titleText.text = node.weapon.name;
        this.descriptionText.text = `Weapon (${node.weapon.damageTags.join(
          ", "
        )})
Firepower: ${node.weapon.damage} / Rate of Fire: ${node.weapon.rof}rpm\n`;
        break;
      case "tech":
        this.titleText.text = node.tech.name;
        this.descriptionText.text = `Tech (${node.tech.tags.join(", ")})
${node.tech.description}\n`;
        break;
    }

    this.background.height =
      this.descriptionText.height + this.titleText.height + 5;
    this.background.width =
      Math.max(
        150,
        Math.max(this.titleText.width, this.descriptionText.width)
      ) + 15;
  }
}
