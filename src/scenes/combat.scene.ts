import {
  Container,
  DisplayObject,
  FederatedPointerEvent,
  Graphics,
  Ticker,
} from "pixi.js";
import { Projectile } from "../objects/projectile";
import { normalizeVector } from "../util/math";

export class CombatScene extends Container {
  private background: Graphics;

  /**
   * The current location of the pointer while firing.
   */
  private shootAt?: { x: number; y: number };

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

    this.calculateBounds();

    this.on("pointerdown", (e: FederatedPointerEvent) =>
      this.handleMouseDown(e)
    );
    this.on("pointermove", (e: FederatedPointerEvent) =>
      this.handleMouseMove(e)
    );
    this.on("pointerup", (e: FederatedPointerEvent) => this.handleMouseUp(e));
  }

  handleMouseMove(e: FederatedPointerEvent): void {
    // update pointer location if set
    if (this.shootAt) {
      this.shootAt = { x: e.globalX, y: e.globalY };
    }
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
        const origin = { x: 750, y: 400 };
        this.shootTime = 0;
        const velocity = normalizeVector(
          { x: this.shootAt.x - origin.x, y: this.shootAt.y - origin.y },
          10
        );
        const projectile = new Projectile()
          .beginFill(0xffffff)
          .drawRect(0, 0, 6, 2)
          .endFill()
          .setRotatable(true)
          .setVelocity(velocity.x, velocity.y);
        projectile.x = origin.x;
        projectile.y = origin.y;

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
        cull.push(child1);
      }
    });

    // cull all out-of-bounds objects
    cull.forEach((childToCull) => {
      childToCull.destroy();
    });
  }
}
