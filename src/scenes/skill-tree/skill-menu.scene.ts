import { Container, Graphics, Text, Ticker } from "pixi.js";
import { Easing, Group, Tween } from "tweedle.js";
import { PlayerService } from "../../services/player.service";
import { SkillTreeObject, TREE_HEIGHT, TREE_WIDTH } from "./objects/skill-tree";
import { Class, ClassId } from "./skill-tree.model";
import { tier1red } from "./trees";
import { tier0 } from "./trees/tier-0-ship";

/**
 * Scene for displaying available skill trees to choose from.
 *
 * Origin (0,0) is in the top left corner of the main grid menu
 * Some parts will stick out over the left.
 */
export class SkillMenuScene extends Container {
  private classes: Class[] = [
    {
      id: "t0-ship",
      name: "JOURNEYMAN-class",
      description: "A basic mech equipped with a rotary cannon.",
      skillTree: tier0,
    },
    {
      id: "t1-red",
      name: "RAIDER-class",
      description: "A heavily-armoured mech equipped with a missile system.",
      skillTree: tier1red,
      prerequisites: {
        r: 3,
      },
    },
  ];

  private grid: Container;
  private trees: {
    [k: ClassId]: {
      tree: SkillTreeObject;
      hoverState: Graphics;
      prereqText: Text;
    };
  };
  private activeTree?: SkillTreeObject;
  private activeTreeOriginalPosition?: { x: number; y: number };

  private backToGridButton: Container;

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
      tree.width = TREE_WIDTH / 3;
      tree.height = TREE_HEIGHT / 3;
      // position in a grid
      // add half again because tree is center-origin
      tree.x = (idx % 3) * tree.width + tree.width / 2;
      tree.y = Math.floor(idx / 3) * tree.height + tree.width / 2;

      const hoverState = this.grid.addChild(
        new Graphics()
          .beginFill(0xffffff)
          .drawRect(0, 0, tree.width, tree.height)
          .endFill()
      );
      const border = this.grid.addChild(
        new Graphics()
          .lineStyle(2, 0xffffff)
          .drawRect(0, 0, tree.width, tree.height)
      );
      hoverState.x = tree.x - tree.width / 2;
      hoverState.y = tree.y - tree.height / 2;
      border.x = tree.x - tree.width / 2;
      border.y = tree.y - tree.height / 2;
      hoverState.alpha = 0;
      hoverState.interactive = true;

      const redReqs = c.prerequisites?.r
        ? `${c.prerequisites.r} Ship Rating\n`
        : "";
      const greenReqs = c.prerequisites?.g
        ? `${c.prerequisites.g} Pilot Rating\n`
        : "";
      const blueReqs = c.prerequisites?.b
        ? `${c.prerequisites.b} Tech Rating\n`
        : "";
      const prereqText = this.grid.addChild(
        new Text(`Requires:\n${redReqs}${greenReqs}${blueReqs}`, {
          fill: 0xffffff,
          fontFamily: "Courier New",
          fontSize: 22,
        })
      );
      prereqText.x = tree.x - 140;
      prereqText.y = tree.y - 80;

      this.trees[c.id] = { tree, hoverState, prereqText };

      // add hover events for visuals + to block clicks on the trees themselves
      hoverState.on("pointerover", (e) => {
        e.stopPropagation();
        if (PlayerService.canAllocateClass(c)) {
          hoverState.alpha = 0.3;
        }
      });
      hoverState.on("pointerout", (e) => {
        e.stopPropagation();
        hoverState.alpha = 0;
      });
      hoverState.on("pointerdown", (e) => {
        e.stopPropagation();
        // don't open tree if player can't allocate
        // TODO: allow previewing nodes without selecting them
        if (PlayerService.canAllocateClass(c)) {
          this.switchToTree(c.id);
        }
      });
    });

    // update class hover state and display based on ability to allocate nodes
    PlayerService.allocatedNodes.subscribe(
      () => {
        this.classes.forEach((c) => {
          if (PlayerService.canAllocateClass(c)) {
            this.trees[c.id].tree.alpha = 1;
            this.trees[c.id].hoverState.cursor = "pointer";
            this.trees[c.id].prereqText.visible = false;
          } else {
            this.trees[c.id].tree.alpha = 0.5;
            this.trees[c.id].hoverState.cursor = "default";
            this.trees[c.id].prereqText.visible = true;
          }
        });
      },
      { emitImmediately: true }
    );

    this.backToGridButton = new Container();
    this.backToGridButton.addChild(
      new Text("View all classes", {
        fill: 0xffffff,
        fontFamily: "Courier New",
        fontSize: 18,
      })
    );
    this.backToGridButton.x = 0;
    this.backToGridButton.y = 0;
    this.backToGridButton.interactive = true;
    this.backToGridButton.on("pointerdown", () => {
      this.switchToGrid();
    });

    this.switchToTree(this.classes[0].id);
  }

  switchToTree(id: ClassId) {
    const tree = this.trees[id].tree;

    this.grid.visible = false;

    // swap the tree into the main scene so it remains visible
    this.grid.removeChild(tree);
    this.activeTree = this.addChild(tree);
    this.activeTreeOriginalPosition = { x: tree.x, y: tree.y };

    // expand animation
    new Tween(tree, this.animationGroup)
      .to(
        {
          x: TREE_WIDTH / 2,
          y: TREE_HEIGHT / 2,
          width: TREE_WIDTH,
          height: TREE_HEIGHT,
        },
        250
      )
      .easing(Easing.Quadratic.Out)
      .start()
      .onComplete(() => {
        this.addChild(this.backToGridButton);
      });
  }

  switchToGrid() {
    if (this.activeTree && this.activeTreeOriginalPosition) {
      this.activeTree.x = this.activeTreeOriginalPosition.x;
      this.activeTree.y = this.activeTreeOriginalPosition.y;
      this.activeTree.width = TREE_WIDTH / 3;
      this.activeTree.height = TREE_HEIGHT / 3;
      this.grid.visible = true;
      // swap the tree back into the grid so it can be hidden alongside the rest
      this.grid.addChildAt(this.activeTree, 0);
      this.removeChild(this.activeTree);
      this.removeChild(this.backToGridButton);

      this.activeTree = undefined;
      this.activeTreeOriginalPosition = undefined;
    }
  }
}
