import {
  Container,
  DisplayObject,
  FederatedPointerEvent,
  Graphics,
  Text,
  Ticker,
} from "pixi.js";
import { Group } from "tweedle.js";
import { WEAPONS } from "../data/weapons";
import { Entity } from "../objects/entity";
import { PhysicsObject } from "../objects/physics-object";
import { Player } from "../objects/player";
import { Projectile } from "../objects/projectile";
import {
  StatAdjustments,
  calculateFinalStat,
  flattenStatAdjustments,
  getAdjustmentDescriptions,
} from "./combat.model";

export class CombatScene extends Container {
  private background: Graphics;

  private score = 0;
  private scoreText: Text;

  /**
   * The current location of the pointer while firing.
   */
  private crosshair = { x: 0, y: 0 };
  private firing = false;

  private player: Player;

  private weapons = Object.values(WEAPONS);
  private selectedWeapon = 0;
  private selectedWeaponText: Text;

  private pausedText: Text;

  private shootTime = 0;
  private ticker = Ticker.shared.add(() => this.update());
  private spawner: Ticker;

  private activeCollisions: { [k: string]: { [k: string]: boolean } } = {};

  private availableBuffs: {
    description: string;
    adjustments: StatAdjustments;
  }[] = [
    {
      description: "+1 Global Base Damage",
      adjustments: { damage: { global: { addition: 1, multiplier: 0 } } },
    },
    {
      description: "+10% Kinetic Damage",
      adjustments: { damage: { kinetic: { addition: 0, multiplier: 0.1 } } },
    },
    {
      description: "+10% Explosive Damage",
      adjustments: { damage: { explosive: { addition: 0, multiplier: 0.1 } } },
    },
    {
      description: "+8% Global Rate of Fire",
      adjustments: { rof: { global: { addition: 0, multiplier: 0.08 } } },
    },
    {
      description: "-20% Projectile Damage\n+50% Explosive Damage",
      adjustments: {
        damage: {
          projectile: { addition: 0, multiplier: -0.2 },
          explosive: { addition: 0, multiplier: 0.5 },
        },
      },
    },
    {
      description: "-10% Global Damage\n+25% Global Rate of Fire",
      adjustments: {
        damage: { global: { addition: 0, multiplier: -0.1 } },
        rof: { global: { addition: 0, multiplier: 0.25 } },
      },
    },
    {
      description: "+1 Projectile HP (pierces)",
      adjustments: { projectileHP: { global: { addition: 1, multiplier: 0 } } },
    },
  ];
  private activeBuffs: { description: string; adjustments: StatAdjustments }[] =
    [];
  private buffText: Text;

  constructor() {
    super();

    this.background = new Graphics()
      .beginFill(0x6495ed)
      .drawRect(0, 0, 1500, 800)
      .endFill()
      .beginFill(0x000000)
      .drawRect(1, 1, 1498, 798)
      .endFill();
    this.cursor = "crosshair";
    this.addChild(this.background);

    // todo: add some helpers which make adding/setting location of these elements nicer.

    this.player = new Player();
    this.player.x = 750;
    this.player.y = 400;
    this.addChild(this.player);
    this.player.on("destroyed", () => this.handleGameEnd());

    this.scoreText = new Text(`Score ${this.score}`, {
      fill: 0x00ff00,
      fontFamily: "Courier New",
      fontSize: 18,
    });
    this.scoreText.x = 1400;
    this.scoreText.y = 770;
    this.addChild(this.scoreText);

    this.selectedWeaponText = new Text(
      `Selected Weapon: [${this.weapons[this.selectedWeapon].name}]`,
      {
        fill: 0x00ffff,
        fontFamily: "Courier New",
        fontSize: 18,
      }
    );
    this.selectedWeaponText.x = 20;
    this.selectedWeaponText.y = 770;
    this.addChild(this.selectedWeaponText);

    this.buffText = new Text(`Active Buffs:`, {
      fill: 0xffffff,
      fontFamily: "Courier New",
      fontSize: 14,
    });
    this.buffText.x = 20;
    this.buffText.y = 20;
    this.addChild(this.buffText);

    this.pausedText = new Text("GAME PAUSED", {
      fill: 0xffffff,
      fontFamily: "Courier New",
      fontSize: 36,
    });
    this.pausedText.x = 750 - this.pausedText.width / 2;
    this.pausedText.y = 400 - this.pausedText.height / 2;
    this.pausedText.visible = false;
    this.addChild(this.pausedText);

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
      // set speed based on direction
      switch (e.code) {
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
      this.ticker.stop();
      this.spawner.stop();
    } else {
      this.pausedText.visible = false;
      this.ticker.start();
      this.spawner.start();
    }
  }

  spawnEnemy() {
    const enemy = Entity.ASTEROID(this.spawner.speed);
    enemy.x = Math.random() * 1500;
    enemy.y = Math.random() * 800;
    enemy.setVelocityTo(
      this.player.x,
      this.player.y,
      Math.ceil(3 / Math.ceil(Math.random() * enemy.maxHP + 1)) *
        this.spawner.speed
    );
    enemy.on("destroyed", () => {
      if (enemy.hp <= 0) {
        this.score += 1;
        if (this.score % 10 === 0) {
          // add a random buff.
          const newBuff =
            this.availableBuffs[
              Math.floor(Math.random() * this.availableBuffs.length)
            ];
          console.log(newBuff.description);
          this.activeBuffs.push(newBuff);
          this.spawner.speed += 0.1;
        }
      }
    });
    this.addChild(enemy);
  }

  update() {
    this.scoreText.text = `Score ${this.score}`;
    this.selectedWeaponText.text = `Selected Weapon: [${
      this.weapons[this.selectedWeapon].name
    }]`;

    this.player.rotation = Math.atan2(
      this.crosshair.y - this.player.y,
      this.crosshair.x - this.player.x
    );

    this.player.statAdjustments = flattenStatAdjustments(
      this.activeBuffs.map((buff) => buff.adjustments)
    );
    this.buffText.text = `Active Buffs:\n${getAdjustmentDescriptions(
      this.player.statAdjustments
    )}`;

    const weapon = this.weapons[this.selectedWeapon];
    const finalRof = calculateFinalStat(
      "rof",
      [],
      weapon.rof,
      this.player.statAdjustments
    );

    // Fire if able
    if (this.shootTime <= 60_000 / finalRof) {
      this.shootTime += this.ticker.deltaMS;
    } else {
      if (this.firing) {
        this.shootTime = 0;
        const origin = this.player.shootBox.getGlobalPosition();
        const projectile = new Projectile({
          owner: this.player,
          source: weapon,
        }).setRotatable(true);
        weapon.drawProjectile(projectile);
        projectile.x = origin.x;
        projectile.y = origin.y;
        projectile.source = weapon;
        projectile.setVelocityTo(
          this.crosshair.x,
          this.crosshair.y,
          weapon.projectileSpeed ?? 10
        );

        this.addChild(projectile);
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
