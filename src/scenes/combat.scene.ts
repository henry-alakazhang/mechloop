import {
  Container,
  DisplayObject,
  FederatedPointerEvent,
  Graphics,
  Ticker,
} from "pixi.js";
import { WEAPONS } from "../data/weapons";
import { Enemy } from "../objects/enemy";
import { PhysicsObject } from "../objects/physics-object";
import { PlayerShip } from "../objects/player-ship";
import { Projectile } from "../objects/projectile";

export class CombatScene extends Container {
  private background: Graphics;

  /**
   * The current location of the pointer while firing.
   */
  private crosshair = { x: 0, y: 0 };
  private firing = false;

  private player: PlayerShip;

  private weapons = Object.values(WEAPONS);
  private selectedWeapon = 0;

  private shootTime = 0;
  private ticker = Ticker.shared.add(() => this.update());
  private spawner: Ticker;

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

    this.player = new PlayerShip();
    this.player.x = 750;
    this.player.y = 400;

    this.addChild(this.player);

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
        case "Space":
          // cycle weapons
          this.selectedWeapon = (this.selectedWeapon + 1) % this.weapons.length;
          break;
        default:
          break;
      }
    });

    document.addEventListener("keyup", (e: KeyboardEvent) => {
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

  spawnEnemy() {
    const enemy = Enemy.ASTEROID();
    enemy.x = Math.random() * 1500;
    enemy.y = Math.random() * 800;
    enemy.setVelocityTo(this.player.x, this.player.y, 1);
    this.addChild(enemy);
  }

  update() {
    this.player.rotation = Math.atan2(
      this.crosshair.y - this.player.y,
      this.crosshair.x - this.player.x
    );

    // Fire if able
    if (this.shootTime <= 60_000 / this.weapons[this.selectedWeapon].rof) {
      this.shootTime += this.ticker.deltaMS;
    } else {
      if (this.firing) {
        this.shootTime = 0;
        const origin = this.player.shootBox.getGlobalPosition();
        const projectile = new Projectile().setRotatable(true);
        this.weapons[this.selectedWeapon].drawProjectile(projectile);
        projectile.x = origin.x;
        projectile.y = origin.y;
        projectile.source = this.weapons[this.selectedWeapon];
        projectile.setVelocityTo(this.crosshair.x, this.crosshair.y, 10);

        this.addChild(projectile);
      }
    }

    const cull: DisplayObject[] = [];

    const physicsObjects = this.children.filter(
      (x): x is PhysicsObject => x instanceof PhysicsObject
    );

    physicsObjects.forEach((child1) => {
      physicsObjects.forEach((child2) => {
        // check collision between objects of different sides
        if (
          child1.side !== child2.side &&
          child1.getBounds().intersects(child2.getBounds())
        ) {
          // TODO: make it so objects only collide once by default
          child1.onCollide(child2);
          child2.onCollide(child1);
        }
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
  }
}
