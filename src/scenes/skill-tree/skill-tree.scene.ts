import { Container, Graphics } from "pixi.js";
import { SkillTree } from "./skill-tree.model";

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
        x: 0,
        y: 0,
        name: "JOURNEYMAN-class Frigate",
        type: "class",
      },
      {
        id: "journeyman-red-1",
        connected: ["journeyman"],
        x: 0,
        y: -40,
        name: "+5 Maximum HP; +1 Global Damage",
        type: "minor",
        colour: "r",
        statAdjustments: { damage: { global: { addition: 1, multiplier: 0 } } },
      },
      {
        id: "journeyman-red-2-defensive",
        connected: ["journeyman-red-1"],
        x: 25,
        y: -100,
        name: "+5 Armour",
        type: "minor",
        colour: "r",
        // TODO: implement
      },
      {
        id: "journeyman-red-2-offensive",
        connected: ["journeyman-red-1"],
        x: -25,
        y: -100,
        name: "+5% Global Damage",
        type: "minor",
        colour: "r",
        statAdjustments: {
          damage: { global: { addition: 0, multiplier: 0.05 } },
        },
      },
      {
        id: "journeyman-red-capstone",
        connected: ["journeyman-red-2-defensive", "journeyman-red-2-offensive"],
        x: 0,
        y: -170,
        name: "Rapid Armour Calibration",
        type: "skill",
        colour: "r",
        // TODO: implement
      },
      {
        id: "journeyman-green-1",
        connected: ["journeyman"],
        x: 34.6, // approx 20sqrt3
        y: 20,
        name: "+5 Maximum HP; +5% Critical Strike Chance",
        type: "minor",
        colour: "g",
        statAdjustments: { damage: { global: { addition: 1, multiplier: 0 } } },
      },
      {
        id: "journeyman-blue-1",
        connected: ["journeyman"],
        x: -34.6, // approx 20sqrt3
        y: 20,
        name: "+5 Maximum HP; +5% Area of Effect",
        type: "minor",
        colour: "b",
        statAdjustments: { damage: { global: { addition: 1, multiplier: 0 } } },
      },
    ];
    this.treeGraphics = {};
    this.selected = {};

    this.tree.forEach((passive) => {
      const colour =
        passive.colour === "r"
          ? 0xff3377
          : passive.colour === "g"
          ? 0x77ff33
          : passive.colour === "b"
          ? 0x3377ff
          : 0xffffff;
      const node = new Graphics().lineStyle(2, colour);
      switch (passive.type) {
        case "major":
          node.drawCircle(0, 0, 15);
          break;
        case "minor":
          node.drawCircle(0, 0, 10);
          break;
        case "class":
          node.drawCircle(0, 0, 30);
          break;
        case "weapon":
        case "skill":
          node.drawRoundedRect(-15, -15, 30, 30, 2);
          break;
      }
      node.x = passive.x;
      node.y = passive.y;
      // TODO: display tooltip with name/description
      node.on("pointerover", () => {});
      // TODO: activate node
      node.on("pointerdown", () => {});
      this.addChild(node);
      this.treeGraphics[passive.id] = node;
      // TODO: connections between nodes
    });
  }
}
