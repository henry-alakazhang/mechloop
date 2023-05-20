import { Graphics } from "pixi.js";
import { StatAdjustments, calculateFinalStat } from "../combat.model";

interface HpBarConfig {
  showHealthBar: "never" | "damaged" | "always";
}

export class HpBar extends Graphics {
  private showHealthBar: "always" | "damaged" | "never";

  private healthBar: Graphics;
  private armourBar: Graphics;
  private shieldBar: Graphics;

  constructor(config: HpBarConfig) {
    super();

    this.showHealthBar = config.showHealthBar;

    this.healthBar = this.addChild(
      // green bar (TODO change color)?
      new Graphics().beginFill(0x00bb00).drawRect(0, 0, 10, 3)
    );
    this.armourBar = this.addChild(
      // yellowish brownish bar
      new Graphics().beginFill(0xbbbb55).drawRect(0, 0, 10, 3)
    );
    this.shieldBar = this.addChild(
      // transparent cyan bar drawn over the top of the others
      // slightly taller to wrap the other bars
      new Graphics().beginFill(0x88ffff, 0.5).drawRect(0, -1, 10, 5)
    );
    this.visible = this.showHealthBar === "always";
  }

  redraw({
    width,
    hp,
    maxHP,
    shields,
    maxShields,
    armour,
    tempArmour,
    statAdjustments,
  }: {
    width: number;
    hp: number;
    maxHP: number;
    shields: number;
    maxShields: number;
    armour: number;
    tempArmour: number;
    statAdjustments: StatAdjustments;
  }) {
    // update health bar visibility and size
    if (this.showHealthBar === "always") {
      this.visible = true;
    } else if (this.showHealthBar === "damaged") {
      this.visible = hp !== maxHP || shields !== maxShields;
    } else {
      this.visible = false;
    }

    // if healthbar isn't visible, no point in updating graphics
    if (!this.visible) {
      return;
    }

    // calculate actual armour numbers
    const finalArmour = Math.min(
      calculateFinalStat("armour", [], armour, statAdjustments),
      maxHP
    );
    const displayedArmour = Math.max(
      // temp armour
      tempArmour,
      // remaining armour after lost HP
      finalArmour - (maxHP - hp)
    );

    // recalculate widths
    this.shieldBar.width = Math.max(
      0,
      // the shield bar is always up to full width (it's rendered over the other bars)
      (width * shields) / maxShields
    );
    this.healthBar.width = Math.max(
      0,
      // the hp bar is always up to full width as well.
      // the armour bar is applied on top.
      (width * hp) / maxHP
    );
    this.armourBar.width = Math.max(
      0,
      // the armour bar covers the HP bar based on how much armour you have
      // but it caps out at your actual HP.
      (width * Math.min(displayedArmour, hp)) / maxHP
    );
    // set the armour bar so it's always covering the right side of the HP bar
    this.armourBar.x =
      this.healthBar.x + this.healthBar.width - this.armourBar.width;
  }
}
