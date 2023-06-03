import { CombatEntity } from "./entity";

describe("CombatEntity", () => {
  /**
   * "random" chance that will always succeed
   */
  const RAND_HIT = 0.7;
  /**
   * "random" chance that will always fail
   */
  const RAND_MISS = 0.3;
  let entity: CombatEntity;

  beforeAll(() => {
    Math.random = () => 0.5;
  });

  beforeEach(() => {
    entity = new CombatEntity({ side: "player", maxHP: 100 });
  });

  afterEach(() => {
    // is this actually needed?
    entity.destroy();
  });

  describe("buffs", () => {
    test("should add and track buffs", () => {
      entity.buffs.push({
        remaining: 1000,
      });

      expect(entity.buffs).toHaveLength(1);
    });

    test("should expire buffs at end of duration", () => {
      const expire = jest.fn();
      entity.buffs.push({
        remaining: 1000,
        expire,
      });
      expect(entity.buffs).toHaveLength(1);

      // fixme: handle tickers better using mocks/dependency injection
      (entity as any).ticker.deltaMS = 500;
      (entity as any).update(0);
      expect(entity.buffs).toHaveLength(1);

      (entity as any).update(0);
      expect(entity.buffs).toHaveLength(0);
      expect(expire).toHaveBeenCalledTimes(1);
    });
  });

  describe("statAdjustments", () => {
    test("should track stat adjustments", () => {
      entity.statAdjustments = { damage: { global: { addition: 1 } } };

      (entity as any).update(0);

      expect(entity.statAdjustments).toEqual({
        damage: { global: { addition: 1, multiplier: 0 } },
      });
    });

    test("should track statAdjustments from buffs", () => {
      entity.buffs.push({
        stats: { damage: { global: { addition: 1 } } },
        remaining: 1000,
      });

      (entity as any).update(0);

      expect(entity.statAdjustments).toEqual({
        damage: { global: { addition: 1, multiplier: 0 } },
      });
    });

    test("should track conditional statAdjustments", () => {
      entity.conditionalStats = [
        {
          condition: ["maxHP", "==", entity.maxHP],
          statAdjustments: { damage: { global: { addition: 1 } } },
        },
        {
          condition: ["maxHP", ">=", entity.maxHP + 1],
          statAdjustments: { rof: { global: { addition: 1 } } },
        },
      ];

      (entity as any).update(0);

      expect(entity.statAdjustments).toEqual({
        damage: { global: { addition: 1, multiplier: 0 } },
        // no rof because rof condition is not met
      });
    });

    test("should merge stat adjustments from all sources", () => {
      entity.statAdjustments = { damage: { global: { addition: 1 } } };
      entity.buffs.push({
        stats: { damage: { global: { multiplier: 1 } } },
        remaining: 1000,
      });
      entity.conditionalStats = [
        {
          condition: ["maxHP", "==", entity.maxHP],
          statAdjustments: { damage: { global: { addition: 1 } } },
        },
      ];

      (entity as any).update(0);

      expect(entity.statAdjustments).toEqual({
        damage: { global: { addition: 2, multiplier: 1 } },
      });
    });

    test("should recalculate max HP, shields and armour if modified by adjustments", () => {
      entity.destroy();
      entity = new CombatEntity({ side: "player", maxHP: 10, maxShields: 10 });
      entity.statAdjustments = {
        maxHP: { global: { addition: 1 } },
        maxShields: { global: { addition: 1 } },
        armour: { global: { addition: 11 } }, // no base armour
      };

      (entity as any).update(0);

      expect(entity.maxHP).toEqual(11);
      expect(entity.maxShields).toEqual(11);
      expect(entity.armour).toEqual(11);
    });

    test("should keep HP at the same percentage if modified by adjustments", () => {
      // 100 is half of 200
      entity.hp = 50;
      entity.statAdjustments = {
        maxHP: { global: { multiplier: 1 } },
      };

      (entity as any).update(0);

      // should remain half of the new amount
      expect(entity.hp).toEqual(100);
      expect(entity.maxHP).toEqual(200);
    });

    test("should add extra armour if modified by adjustments", () => {
      entity.statAdjustments = {
        armour: { global: { addition: 10 } },
      };

      expect(entity.armour).toEqual(0);

      (entity as any).update(0);

      expect(entity.armour).toEqual(10);
      expect(entity.maxArmour).toEqual(10);
    });

    test("should adjust size if modified by adjustments", () => {
      entity.beginFill().drawRect(0, 0, 1, 1).endFill();
      expect(entity.width).toEqual(1);

      entity.statAdjustments = {
        effectSize: { global: { multiplier: 1 } },
      };

      (entity as any).update(0);

      expect(entity.width).toEqual(2);
    });
  });

  describe("onKill", () => {
    describe("hpOnKill", () => {
      test("should heal by hpOnKill amount", () => {
        entity.statAdjustments = {
          hpOnKill: { global: { addition: 1 } },
        };

        (entity as any).update(0);

        entity.maxHP = 100;
        entity.hp = 10;
        entity.onKill(entity /* doesn't matter */);

        expect(entity.hp).toEqual(11);
      });

      test("should not heal above maxHP", () => {
        entity.statAdjustments = {
          hpOnKill: { global: { addition: 100 } },
        };

        (entity as any).update(0);

        entity.maxHP = 100;
        entity.hp = 10;
        entity.onKill(entity /* doesn't matter */);

        expect(entity.hp).toEqual(100);
      });

      test("should heal armour if HP is full", () => {
        entity.statAdjustments = {
          hpOnKill: { global: { addition: 1 } },
        };

        (entity as any).update(0);

        entity.maxHP = 100;
        entity.hp = 100;
        entity.maxArmour = 50;
        entity.armour = 0;
        entity.onKill(entity /* doesn't matter */);

        expect(entity.hp).toEqual(100);
        expect(entity.armour).toEqual(1);
      });

      test("should not heal armour if HP needs healing", () => {
        entity.statAdjustments = {
          hpOnKill: { global: { addition: 1 } },
        };

        (entity as any).update(0);

        entity.maxHP = 100;
        entity.hp = 10;
        entity.maxArmour = 50;
        entity.armour = 0;
        entity.onKill(entity /* doesn't matter */);

        expect(entity.hp).toEqual(11);
        expect(entity.armour).toEqual(0);
      });
    });
  });

  describe("takeDamage", () => {
    test("should reduce HP", () => {
      entity.takeDamage(50);
      expect(entity.hp).toEqual(50);
    });

    test("should round off HP after damage", () => {
      entity.takeDamage(0.6);
      expect(entity.hp).toEqual(99);
    });

    describe("with damage modifiers", () => {
      test("should reduce damage with negative damage modifiers", () => {
        entity.statAdjustments = {
          damageTaken: { global: { multiplier: -0.5 } },
        };

        (entity as any).update(0);

        entity.takeDamage(10);
        expect(entity.hp).toEqual(95);
      });

      test("should increase damage with positive damage modifier", () => {
        entity.statAdjustments = {
          damageTaken: { global: { multiplier: 0.5 } },
        };

        (entity as any).update(0);

        entity.takeDamage(10);
        expect(entity.hp).toEqual(85);
      });
    });

    describe("with armour", () => {
      test("should reduce damage by armour class", () => {
        entity.armour = 50;
        entity.armourClass = 5;
        entity.takeDamage(10);
        expect(entity.hp).toEqual(95);

        entity.armourClass = 10;
        entity.takeDamage(20);
        expect(entity.hp).toEqual(85);
      });

      test("should not reduce damage below 1", () => {
        entity.armour = 50;
        entity.armourClass = 1;
        entity.takeDamage(1);
        expect(entity.hp).toEqual(99);
      });

      test("should have no effect once broken", () => {
        entity.armour = 50;
        entity.armourClass = 10;
        entity.takeDamage(60);
        // took 50 damage due to armour reduction
        expect(entity.hp).toEqual(50);

        // armour should no longer be active: will take all damage
        entity.takeDamage(60);
        expect(entity.hp).toEqual(-10);
      });

      test("should adjust damage reduction based on AC stat adjustments", () => {
        entity.armour = 50;
        entity.armourClass = 1;
        entity.statAdjustments = {
          armourClass: { global: { addition: 1 } },
        };

        (entity as any).update(0);

        entity.takeDamage(10);
        // should take 2 reduced damage due to AC adjustment
        expect(entity.hp).toEqual(92);
      });

      test("should apply after damage modifiers", () => {
        entity.armour = 50;
        entity.armourClass = 1;
        entity.statAdjustments = {
          damageTaken: { global: { multiplier: -0.5 } },
        };

        (entity as any).update(0);

        entity.takeDamage(10);
        // should take 10 / 2 = 5 - 1 = 4 damage
        expect(entity.hp).toEqual(96);
      });
    });

    describe("with evasion", () => {
      test("should randomly evade damage", () => {
        // if evade chance is missed, it should not reduce damage
        entity.evadeChance = RAND_MISS;
        entity.evadeEffect = 0.2;
        entity.takeDamage(25);
        expect(entity.hp).toEqual(75);

        // if evade chance is hit, it should reduce damage (25% -> 25 - 5 = 20)
        entity.evadeChance = RAND_HIT;
        entity.takeDamage(25);
        expect(entity.hp).toEqual(55);
      });

      test("should stack at over 100%", () => {
        // if evade chance is missed, it should still reduce by 25%
        entity.evadeChance = 1 + RAND_MISS;
        entity.evadeEffect = 0.2;
        entity.takeDamage(25);
        expect(entity.hp).toEqual(80);

        // if evade chance is hit, it should reduce damage further (25 * 0.75 * 0.75 = 16)
        entity.evadeChance = 1 + RAND_HIT;
        entity.takeDamage(25);
        expect(entity.hp).toEqual(64);
      });

      test("should apply before armour", () => {
        entity.evadeChance = RAND_HIT;
        entity.evadeEffect = 0.2;
        entity.armour = 50;
        entity.armourClass = 5;
        entity.takeDamage(25);
        // 25 * 0.8 = 20, 20 - 5 = 15
        expect(entity.hp).toEqual(85);
      });

      test("should apply multiplicatively with damage modifiers", () => {
        entity.evadeChance = RAND_HIT;
        entity.evadeEffect = 0.2;
        entity.statAdjustments = {
          damageTaken: { global: { multiplier: -0.5 } },
        };

        (entity as any).update(0);

        entity.takeDamage(10);
        // should take 10 * 0.5 = 5 * 0.8 = 4 damage
        expect(entity.hp).toEqual(96);
      });

      test("should adjust evade chance based on evasion stat adjustments", () => {
        entity.evadeChance = RAND_MISS;
        entity.evadeEffect = 0.2;
        entity.statAdjustments = {
          // this should bump evade chance to a successful evade
          evadeChance: { global: { addition: RAND_HIT - RAND_MISS } },
        };

        (entity as any).update(0);

        entity.takeDamage(25);
        expect(entity.hp).toEqual(80);
      });

      test("should adjust evade effect based on evasion stat adjustments", () => {
        entity.evadeChance = RAND_HIT;
        entity.evadeEffect = 0.2;
        entity.statAdjustments = {
          evadeEffect: { global: { addition: 0.3 } },
        };

        (entity as any).update(0);

        entity.takeDamage(20);
        // should take 50% damage (0.2 + 0.3 = 0.5)
        expect(entity.hp).toEqual(90);
      });
    });

    describe("with shields", () => {
      test("should take damage from shields before HP", () => {
        entity.shields = 5;
        entity.takeDamage(5);
        expect(entity.shields).toEqual(0);
        expect(entity.hp).toEqual(100);
      });

      test("should not splash over to HP if shields are depleted", () => {
        entity.shields = 5;
        entity.takeDamage(10);
        expect(entity.shields).toEqual(0);
        expect(entity.hp).toEqual(100);
      });
    });

    describe("with avoidance", () => {
      test("should randomly avoid all damage", () => {
        entity.statAdjustments = {
          avoidance: { global: { addition: RAND_HIT } },
        };
        (entity as any).update(0);
        entity.takeDamage(100);
        expect(entity.hp).toEqual(100);

        entity.statAdjustments = {
          avoidance: { global: { addition: RAND_MISS } },
        };
        (entity as any).update(0);
        entity.takeDamage(100);
        expect(entity.hp).toEqual(0);
      });
    });
  });
});
