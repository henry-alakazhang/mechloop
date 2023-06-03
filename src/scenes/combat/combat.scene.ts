import {
  Container,
  DisplayObject,
  FederatedPointerEvent,
  Graphics,
  Text,
  Ticker,
} from "pixi.js";
import { Group } from "tweedle.js";
import { ActiveSkill } from "../../data/active-skills";
import { Weapon } from "../../data/weapons";
import { PlayerService } from "../../services/player.service";
import { SkillMenuScene } from "../skill-tree/skill-menu.scene";
import {
  ConditionalPassiveNode,
  PassiveNode,
  SkillTree,
  TechNode,
  WeaponNode,
} from "../skill-tree/skill-tree.model";
import {
  calculateFinalStat,
  flattenStatAdjustments,
  getAdjustmentDescriptions,
} from "./combat.model";
import { CombatEntity } from "./objects/entity";
import { HpBar } from "./objects/hp-bar";
import { PhysicsObject } from "./objects/physics-object";
import { PlayerShip } from "./objects/player-ship";

/**
 * Scene for the actual combat gameplay.
 *
 * Origin (0,0) is the top-left corner.
 */
export class CombatScene extends Container {
  private background: Graphics;

  private score = 0;
  private scoreText: Text;

  /**
   * The current location of the pointer while firing.
   */
  private crosshair = { x: 0, y: 0 };
  private firing = false;

  private player: PlayerShip;
  private playerHPBar: HpBar;

  private weapons: Weapon[] = [];
  private selectedWeapon = 0;
  private selectedWeaponText: Text;

  private activeSkills: ActiveSkill[] = [];
  private activeSkillCooldowns: number[] = [];
  private activeSkillsText: Text;

  private pausedText: Text;
  private skillMenuScene: SkillMenuScene;

  private shootTime = 0;
  private ticker = Ticker.shared.add(() => this.update());
  private spawner: Ticker;

  private activeCollisions: { [k: string]: { [k: string]: boolean } } = {};

  private skillTreeText: Text;

  constructor() {
    super();

    // TODO: SO MANY heights and positions are hardcoded
    // currently very hard to adjust game area size.
    // fix at some point

    this.background = new Graphics()
      .beginFill(0x6495ed)
      .drawRect(0, 0, 1500, 800)
      .endFill()
      .beginFill(0x000000)
      .drawRect(1, 1, 1498, 798)
      .endFill();
    this.background.interactive = true;
    this.background.cursor = "crosshair";
    this.addChild(this.background);

    // todo: add some helpers which make adding/setting location of these elements nicer.

    this.player = new PlayerShip();
    this.player.x = 750;
    this.player.y = 400;
    this.addChild(this.player);
    this.player.on("destroyed", () => this.handleGameEnd());

    this.playerHPBar = this.addChild(new HpBar({ showHealthBar: "always" }));
    this.playerHPBar.x = 500;
    this.playerHPBar.y = 770;
    this.playerHPBar.height = 15;

    this.scoreText = new Text(`Score ${this.score}`, {
      fill: 0x00ff00,
      fontFamily: "Courier New",
      fontSize: 18,
    });
    this.scoreText.x = 1400;
    this.scoreText.y = 770;
    this.addChild(this.scoreText);

    this.selectedWeaponText = new Text(
      `Selected Weapon: [${this.weapons[this.selectedWeapon]?.name ?? "None"}]`,
      {
        fill: 0x00ffff,
        fontFamily: "Courier New",
        fontSize: 17,
      }
    );
    this.selectedWeaponText.x = 20;
    this.selectedWeaponText.y = 725;
    this.addChild(this.selectedWeaponText);

    this.activeSkillsText = new Text(
      `Active Skill Q: [${
        this.activeSkills[0]?.name ?? "None"
      }]\nActive Skill E: [${this.activeSkills[1]?.name ?? "None"}]`,
      {
        fill: 0x00ffff,
        fontFamily: "Courier New",
        fontSize: 17,
      }
    );
    this.activeSkillsText.x = 20;
    this.activeSkillsText.y = 750;
    this.addChild(this.activeSkillsText);

    this.skillTreeText = new Text(`Skill Tree:`, {
      fill: 0xffffff,
      fontFamily: "Courier New",
      fontSize: 14,
    });
    this.skillTreeText.x = 20;
    this.skillTreeText.y = 20;
    this.addChild(this.skillTreeText);

    this.pausedText = new Text("GAME PAUSED", {
      fill: 0xffffff,
      fontFamily: "Courier New",
      fontSize: 36,
    });
    this.pausedText.x = 750 - this.pausedText.width / 2;
    this.pausedText.y = 400 - this.pausedText.height / 2;
    this.pausedText.visible = false;
    this.addChild(this.pausedText);

    this.skillMenuScene = new SkillMenuScene();
    this.skillMenuScene.x = 300;
    this.skillMenuScene.y = 100;
    this.skillMenuScene.interactive = true;
    // don't add the skill tree as a child; it gets added and removed when the game is paused

    this.spawner = new Ticker().add(() => this.spawnEnemy());
    this.spawner.minFPS = 2;
    this.spawner.maxFPS = 2;
    this.spawner.start();

    this.calculateBounds();

    this.on("pointerdown", (e: FederatedPointerEvent) =>
      this.handleMouseDown(e)
    );
    this.on("pointermove", (e: FederatedPointerEvent) =>
      this.handleMouseMove(e)
    );
    this.on("pointerup", (e: FederatedPointerEvent) => this.handleMouseUp(e));

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        this.togglePause();
        return;
      }
      if (!this.ticker.started) {
        return;
      }
      switch (e.code) {
        // set speed based on direction
        case "KeyW":
          this.player.setDirectionY(-1);
          break;
        case "KeyA":
          this.player.setDirectionX(-1);
          break;
        case "KeyS":
          this.player.setDirectionY(1);
          break;
        case "KeyD":
          this.player.setDirectionX(1);
          break;
        // use active skills
        case "KeyQ":
          this.useSkill(0);
          break;
        case "KeyE":
          this.useSkill(1);
          break;
        case "Tab":
          // cycle weapons
          this.selectedWeapon = (this.selectedWeapon + 1) % this.weapons.length;
          // prevent default behaviour of switching context
          e.preventDefault();
          break;
        case "Space":
          // toggle autofire
          this.firing = !this.firing;
          break;
        default:
          break;
      }
    });

    document.addEventListener("keyup", (e: KeyboardEvent) => {
      if (!this.ticker.started) {
        return;
      }
      // reset speed to 0
      switch (e.code) {
        case "KeyW":
        case "KeyS":
          this.player.setDirectionY(0);
          break;
        case "KeyA":
        case "KeyD":
          this.player.setDirectionX(0);
          break;
        default:
          break;
      }
    });

    PlayerService.allocatedNodes.subscribe(
      (selected) => {
        this.handleSkillTreeUpdate(Object.values(selected));
      },
      { emitImmediately: true }
    );
  }

  handleMouseMove(e: FederatedPointerEvent): void {
    // update pointer location if set
    this.crosshair.x = e.globalX;
    this.crosshair.y = e.globalY;
  }

  handleMouseDown(e: FederatedPointerEvent): void {
    this.firing = true;
  }

  handleMouseUp(e: FederatedPointerEvent): void {
    this.firing = false;
  }

  handleSkillTreeUpdate(tree: SkillTree) {
    // set all weapons
    this.weapons = tree
      .filter((node): node is WeaponNode => node.type === "weapon")
      .map((node) => node.weapon);
    this.selectedWeapon = 0;
    this.player.statAdjustments = flattenStatAdjustments(
      tree
        .filter((node): node is PassiveNode => node.type === "passive")
        .map((node) => node.statAdjustments)
    );
    this.player.conditionalStats = tree.filter(
      (node): node is ConditionalPassiveNode =>
        node.type === "conditionalPassive"
    );
    this.activeSkills = tree
      .filter((node): node is TechNode => node.type === "tech")
      .map((node) => node.tech);
    this.activeSkillCooldowns = this.activeSkills.map((skill) => 0);
  }

  handleGameEnd() {
    const gameEndBox = this.addChild(
      new Graphics().beginFill(0x111111).drawRect(0, 0, 800, 200).endFill()
    );
    const gameEndText = this.addChild(
      new Text(
        `Game Over!\nFinal Score: ${this.score}\n\nRefresh to play again.`,
        {
          fill: 0xeeeeee,
          fontSize: 36,
          fontFamily: "Courier New",
          align: "center",
        }
      )
    );
    gameEndBox.x = 750 - gameEndBox.width / 2;
    gameEndBox.y = 400 - gameEndBox.height / 2;
    gameEndText.x = 750 - gameEndText.width / 2;
    gameEndText.y = 400 - gameEndText.height / 2;

    this.ticker.stop();
    this.spawner.stop();
  }

  togglePause() {
    if (this.ticker.started) {
      this.pausedText.visible = true;
      // remove and readd so it always sits on top
      this.addChild(this.skillMenuScene);
      this.ticker.stop();
      this.spawner.stop();
    } else {
      this.pausedText.visible = false;
      this.removeChild(this.skillMenuScene);
      this.ticker.start();
      this.spawner.start();
    }
  }

  spawnEnemy() {
    const enemy = CombatEntity.ASTEROID(this.spawner.speed);
    enemy.x = Math.random() * 1500;
    enemy.y = Math.random() * 800;
    enemy.setVelocityTo({
      x: this.player.x,
      y: this.player.y,
      speed:
        Math.ceil(3 / Math.ceil(Math.random() * enemy.maxHP + 1)) *
        this.spawner.speed,
    });
    enemy.on("destroyed", () => {
      if (enemy.hp <= 0) {
        this.score += 1;
        if (this.score % 10 === 0) {
          PlayerService.skillPoints.update((p) => p + 1);
        }
        this.player.onKill(enemy);
      }
    });
    this.addChild(enemy);
  }

  useSkill(index: number) {
    const skill = this.activeSkills[index];
    if (skill && this.activeSkillCooldowns[index] <= 0) {
      const objects = skill.use(this.player, this.crosshair);
      if (objects && objects.length > 0) {
        this.addChild(...objects);
      }

      // this is a bit weird, because recharge speed is supposed to affect
      // the rate of recovery (eg. +50% => 1.5s of CD recovered per second)
      // cooldowns are displayed as text atm, making it impossible to judge how long they have left.
      // instead, we change the actual cooldown based on recharge speed so it's more clear.
      // FIXME: should move it back to the original way once cooldowns are displayed graphically.
      const cdr = calculateFinalStat({
        stat: "rechargeSpeed",
        tags: skill.tags,
        baseValue: 1,
        adjustments: this.player.statAdjustments,
      });
      this.activeSkillCooldowns[index] = (1 / cdr) * skill.cooldown;
    }
  }

  update() {
    // Update all status texts
    this.scoreText.text = `Score ${this.score}`;
    this.selectedWeaponText.text = `Selected Weapon: [${
      this.weapons[this.selectedWeapon].name
    }]`;
    // todo: change text color to signify when a skill is on cooldown
    this.activeSkillsText.text = `Active Skill Q: [${
      this.activeSkills[0]?.name ?? "None"
    } - ${(this.activeSkillCooldowns[0] / 1000).toFixed(
      1
    )}s]\nActive Skill E: [${this.activeSkills[1]?.name ?? "None"} - ${(
      this.activeSkillCooldowns[1] / 1000
    ).toFixed(1)}s]`;
    this.skillTreeText.text = `Skill Tree:\n${getAdjustmentDescriptions(
      this.player.statAdjustments
    )}\n\nUnspent Skill Points: ${PlayerService.skillPoints.currentValue}`;

    this.playerHPBar.redraw({
      // copy all HP/maxHP etc values from the player
      ...this.player,
      width: 500,
    });

    // Reduce all cooldowns by elapsed time
    this.activeSkillCooldowns = this.activeSkillCooldowns.map((cd) =>
      Math.max(0, cd - this.ticker.deltaMS)
    );

    this.player.rotation = Math.atan2(
      this.crosshair.y - this.player.y,
      this.crosshair.x - this.player.x
    );

    const weapon = this.weapons[this.selectedWeapon];
    const finalRof = calculateFinalStat({
      stat: "rof",
      tags: weapon.tags,
      baseValue: weapon.rof,
      adjustments: this.player.statAdjustments,
    });

    // Fire if able
    if (this.shootTime <= 60_000 / finalRof) {
      this.shootTime += this.ticker.deltaMS;
    } else {
      if (this.firing) {
        this.shootTime = 0;
        const projectiles = weapon.shoot(this.player, this.crosshair);
        this.addChild(...projectiles);
      }
    }

    const cull: DisplayObject[] = [];

    const physicsObjects = this.children.filter(
      (x): x is PhysicsObject => x instanceof PhysicsObject
    );

    physicsObjects.forEach((child1) => {
      physicsObjects.forEach((child2) => {
        if (child1.side === child2.side) {
          // ignore collision between objects of the same side
          return;
        }

        // whether the
        const wasColliding = this.activeCollisions[child1.id][child2.id];
        const isColliding = child1.getBounds().intersects(child2.getBounds());
        this.activeCollisions[child1.id][child2.id] = isColliding;

        if (isColliding && !wasColliding) {
          // first time these objects are detected as colliding - trigger collide effects.
          // the other side of the collision is handled by the loop in the other direction
          child1.onCollide(child2);
        }
        // cleaning up active collision is done automatically when they stop intersecting.
      });

      if (!this.background.getBounds().intersects(child1.getBounds())) {
        if (child1 === this.player) {
          const bounds = this.background.getBounds();
          // let player ship wrap around
          if (this.player.x > bounds.right) {
            this.player.x = bounds.left;
          } else if (this.player.x < bounds.left) {
            this.player.x = bounds.right;
          } else if (this.player.y > bounds.bottom) {
            this.player.y = bounds.top;
          } else if (this.player.y < bounds.top) {
            this.player.y = bounds.bottom;
          }
        } else {
          cull.push(child1);
        }
      }

      // and delete anything that has run out of HP
      if (child1.hp <= 0) {
        cull.push(child1);
      }
    });

    // cull all out-of-bounds objects
    cull.forEach((childToCull) => {
      childToCull.destroy();
    });

    Group.shared.update();
  }

  // todo: move this somewhere else
  getNearbyObject(
    from: PhysicsObject,
    side: "player" | "enemy",
    distance: number
  ) {
    return this.children.find((child) => {
      if (!(child instanceof PhysicsObject)) {
        return false;
      }
      if (child.side !== side) {
        return false;
      }
      if (child === from) {
        return false;
      }
      const childBounds = child.getBounds();
      const fromBounds = from.getBounds();
      const dx =
        (childBounds.top + childBounds.bottom) / 2 -
        (fromBounds.top + fromBounds.bottom) / 2;
      const dy =
        (childBounds.left + childBounds.right) / 2 -
        (fromBounds.left + fromBounds.right) / 2;
      return dx * dx + dy * dy < distance * distance;
    });
  }

  override addChild<U extends DisplayObject[]>(...children: U): U[0] {
    // track collisions for added PhysicsObjects
    children.forEach((child) => {
      if (child instanceof PhysicsObject) {
        this.activeCollisions[child.id] = {};
      }
    });
    return super.addChild(...children);
  }

  override removeChild<U extends DisplayObject[]>(...children: U): U[0] {
    // clean up collision tracking for removed PhysicsObjects
    children.forEach((child) => {
      if (child instanceof PhysicsObject) {
        delete this.activeCollisions[child.id];
      }
    });
    return super.removeChild(...children);
  }
}
