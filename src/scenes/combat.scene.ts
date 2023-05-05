import {
  Container,
  DisplayObject,
  FederatedPointerEvent,
  Graphics,
  Ticker,
} from "pixi.js";
import { PlayerShip } from "../objects/player-ship";
import { Projectile } from "../objects/projectile";

export class CombatScene extends Container {
  private background: Graphics;

  /**
   * The current location of the pointer while firing.
   */
  private shootAt?: { x: number; y: number };

  private player: PlayerShip;

  private gun = {
    rof: 240,
  };

  private shootTime = 0;
  private ticker = Ticker.shared.add(() => this.update());

  constructor() {
    super();

    this.background = new Graphics()
      .beginFill(0x6495ed)
      .drawRect(0, 0, 1500, 800)
      .endFill()
      .beginFill(0x000000)
      .drawRect(1, 1, 1498, 798)
      .endFill();

    this.addChild(this.background);

    this.player = new PlayerShip();
    this.player.x = 750;
    this.player.y = 400;

    this.addChild(this.player);

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
    if (this.shootAt) {
      this.shootAt = { x: e.globalX, y: e.globalY };
    }

    this.player.rotation = Math.atan2(
      e.globalY - this.player.y,
      e.globalX - this.player.x
    );
  }

  handleMouseDown(e: FederatedPointerEvent): void {
    this.shootAt = e.global;
  }

  handleMouseUp(e: FederatedPointerEvent): void {
    this.shootAt = undefined;
  }

  update() {
    // Fire if able
    if (this.shootTime <= 60_000 / this.gun.rof) {
      this.shootTime += this.ticker.deltaMS;
    } else {
      if (this.shootAt) {
        this.shootTime = 0;
        const origin = this.player.shootBox.getGlobalPosition();
        const projectile = new Projectile()
          .beginFill(0xffffff)
          .drawRect(0, -1, 6, 1)
          .endFill()
          .setRotatable(true);
        projectile.x = origin.x;
        projectile.y = origin.y;
        projectile.setVelocityTo(this.shootAt.x, this.shootAt.y, 10);

        this.addChild(projectile);
      }
    }

    const cull: DisplayObject[] = [];

    this.children.forEach((child1) => {
      this.children.forEach((child2) => {
        if (child1.getBounds().intersects(child2.getBounds())) {
          // handle collision
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
    });

    // cull all out-of-bounds objects
    cull.forEach((childToCull) => {
      childToCull.destroy();
    });
  }
}
