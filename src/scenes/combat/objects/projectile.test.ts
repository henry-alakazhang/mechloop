import { CombatEntity } from "./entity";
import { Projectile } from "./projectile";

describe("shoot()", () => {
  test("should create as many projectiles as specified", () => {
    const projectiles = Projectile.shoot({
      owner: new CombatEntity({ side: "player", maxHP: 10 }),
      source: { tags: [] } as any,
      from: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      count: 5,
      drawProjectile: (p) => p,
    });
    expect(projectiles).toHaveLength(5);
  });

  // TODO: add tests for firing at targets and angles
  // how?

  describe("statAdjustments", () => {
    test("should modify projectile count based on adjustments", () => {
      const owner = new CombatEntity({ side: "player", maxHP: 10 });
      owner.statAdjustments = {
        projectileCount: { global: { multiplier: 0.5 } },
      };
      (owner as any).update(0);

      const projectiles = Projectile.shoot({
        owner,
        source: { tags: [] } as any,
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 },
        count: 2,
        drawProjectile: (p) => p,
      });
      expect(projectiles).toHaveLength(3);
    });

    test("should round off projectile count", () => {
      const owner = new CombatEntity({ side: "player", maxHP: 10 });
      owner.statAdjustments = {
        projectileCount: { global: { multiplier: 0.33 } },
      };
      (owner as any).update(0);

      const projectiles = Projectile.shoot({
        owner,
        source: { tags: [] } as any,
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 },
        count: 1,
        drawProjectile: (p) => p,
      });
      // 1.33 should round down to 1 again
      expect(projectiles).toHaveLength(1);
    });
  });
});
