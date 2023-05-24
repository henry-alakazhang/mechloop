import { Container, Graphics, Ticker } from "pixi.js";
import { Easing, Group, Tween } from "tweedle.js";
import { SkillTreeObject, TREE_HEIGHT, TREE_WIDTH } from "./objects/skill-tree";
import { Class } from "./skill-tree.model";
import { tier0 } from "./trees/tier-0-ship";

/**
 * Scene for displaying available skill trees to choose from.
 *
 * Origin (0,0) is in the top left corner.
 */
export class SkillMenuScene extends Container {
  private classes: Class[] = [
    {
      id: "tier0",
      name: "JOURNEYMAN-class",
      description: "A basic mech equipped with a rotary cannon.",
      skillTree: tier0,
    },
  ];

  private grid: Container;
  private trees: { [k: string]: SkillTreeObject };

  private animationGroup: Group;

  constructor() {
    super();

    this.trees = {};
    this.animationGroup = new Group();
    // create a ticker so animations can play (?!?!)
    // fixme: this should use the shared ticker and the combat scene shouldn't pause the shared ticker...
    const ticker = new Ticker();
    ticker.add(() => this.animationGroup.update(ticker.deltaMS)).start();

    this.grid = this.addChild(new Container());
    this.classes.forEach((c, idx) => {
      const tree = this.grid.addChild(
        new SkillTreeObject({ tree: c.skillTree })
      );
      tree.width = 300;
      tree.height = 200;
      // position in a grid
      // add 150/100 because tree is center-origin
      tree.x = (idx % 3) * 300 + 150;
      tree.y = Math.floor(idx / 3) * 200 + 100;
      this.trees[c.id] = tree;

      const hoverState = this.grid.addChild(
        new Graphics().beginFill(0xffffff).drawRect(0, 0, 300, 200).endFill()
      );
      // add a border
      this.grid.addChild(
        new Graphics().lineStyle(2, 0xffffff).drawRect(0, 0, 300, 200)
      );
      hoverState.x = tree.x - 150;
      hoverState.y = tree.y - 100;
      hoverState.alpha = 0;
      hoverState.interactive = true;
      hoverState.cursor = "pointer";
      // add hover events for visuals + to block clicks on the trees themselves
      hoverState.on("pointerover", (e) => {
        e.stopPropagation();
        hoverState.alpha = 0.3;
      });
      hoverState.on("pointerout", (e) => {
        e.stopPropagation();
        hoverState.alpha = 0;
      });
      hoverState.on("pointerdown", (e) => {
        e.stopPropagation();
        this.switchToTree(tree);
      });
    });

    this.switchToTree(this.trees[this.classes[0].id]);
  }

  switchToTree(tree: SkillTreeObject) {
    this.grid.visible = false;
    // explicitly add the tree as a child to the main scene so it can be "scene" hehehoohoo
    this.addChild(tree);
    new Tween(tree, this.animationGroup)
      .to({ x: 450, y: 300, width: TREE_WIDTH, height: TREE_HEIGHT }, 333)
      .easing(Easing.Quadratic.Out)
      .start();
  }
}
