import { calculateFinalStat, flattenStatAdjustments } from "./combat.model";

describe("statAdjustments", () => {
  describe("flattenStatAdjustments", () => {
    test("should return a fully-formed adjustments object", () => {
      expect(
        flattenStatAdjustments([{ damage: { global: { addition: 1 } } }])
      ).toEqual({ damage: { global: { addition: 1, multiplier: 0 } } });
    });

    test("should combine multiple adjustments additively", () => {
      expect(
        flattenStatAdjustments([
          { damage: { global: { addition: 1, multiplier: 1 } } },
          { damage: { global: { addition: 1, multiplier: 1 } } },
        ])
      ).toEqual({ damage: { global: { addition: 2, multiplier: 2 } } });
    });

    test("should combine partially-defined adjustments", () => {
      expect(
        flattenStatAdjustments([
          { damage: { global: { addition: 1 } } },
          { damage: { global: { multiplier: 1 } } },
        ])
      ).toEqual({ damage: { global: { addition: 1, multiplier: 1 } } });
    });

    test("should keep adjustments separate for separate tags", () => {
      expect(
        flattenStatAdjustments([
          { damage: { global: { addition: 1 } } },
          { damage: { kinetic: { addition: 1 } } },
        ])
      ).toEqual({
        damage: {
          global: { addition: 1, multiplier: 0 },
          kinetic: { addition: 1, multiplier: 0 },
        },
      });
    });

    test("should keep adjustments separate for different stats", () => {
      expect(
        flattenStatAdjustments([
          { damage: { global: { addition: 1 } } },
          { rof: { global: { addition: 1 } } },
        ])
      ).toEqual({
        damage: { global: { addition: 1, multiplier: 0 } },
        rof: { global: { addition: 1, multiplier: 0 } },
      });
    });
  });

  describe("calculateFinalStat", () => {
    test("should apply global adjustments", () => {
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: { damage: { global: { addition: 1 } } },
          tags: [],
        })
      ).toEqual(2);
    });

    test("should do nothing with no adjustments", () => {
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: {},
          tags: [],
        })
      ).toEqual(1);
    });

    test("should apply tag adjustments to appropriate tags and only appropriate tags", () => {
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: { damage: { kinetic: { addition: 1 } } },
          tags: ["kinetic"],
        })
      ).toEqual(2);
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: { damage: { kinetic: { addition: 1 } } },
          tags: ["explosive"],
        })
      ).toEqual(1);
    });

    test("should apply multiple tags if applicable", () => {
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: {
            damage: {
              kinetic: { addition: 1 },
              explosive: { addition: 1 },
            },
          },
          tags: ["kinetic", "explosive"],
        })
      ).toEqual(3);
    });

    test("should apply multipliers", () => {
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: {
            damage: {
              global: { multiplier: 0.5 },
            },
          },
          tags: [],
        })
      ).toEqual(1.5);
    });

    test("should apply different multipliers additively", () => {
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: {
            damage: {
              global: { multiplier: 0.5 },
              kinetic: { multiplier: 0.5 },
            },
          },
          tags: ["kinetic"],
        })
      ).toEqual(2);
    });

    test("should apply multipliers after additions", () => {
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: {
            damage: {
              global: { addition: 1, multiplier: 0.5 },
            },
          },
          tags: [],
        })
        // (1 + 1) * 1.5 = 3
      ).toEqual(3);
    });

    test("should apply all additions before any multipliers", () => {
      expect(
        calculateFinalStat({
          stat: "damage",
          baseValue: 1,
          adjustments: {
            damage: {
              global: { addition: 1, multiplier: 0.5 },
              kinetic: { addition: 1 },
            },
          },
          tags: ["kinetic"],
        })
        // (1 + 1 + 1) * (1 + 0.5) = 4.5
      ).toEqual(4.5);
    });
  });
});
