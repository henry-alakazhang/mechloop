import { SkillTree } from "../skill-tree.model";

export const tier0: SkillTree = [
  {
    id: "ship",
    connected: [],
    depth: 0,
    index: 0,
    name: "JOURNEYMAN-class Frigate",
    type: "class",
  },
  {
    id: "red-1",
    connected: ["ship"],
    depth: 1,
    index: -3,
    name: "+10 Maximum HP; +2 Global Damage",
    type: "passive",
    colour: "r",
    statAdjustments: { damage: { global: { addition: 2, multiplier: 0 } } },
  },
  {
    id: "red-2-defensive",
    connected: ["red-1"],
    depth: 2,
    index: -4,
    name: "+15 Armour",
    type: "passive",
    colour: "r",
    // TODO: implement
    statAdjustments: {},
  },
  {
    id: "red-2-offensive",
    connected: ["red-1"],
    depth: 2,
    index: -2,
    name: "+15% Global Damage",
    type: "passive",
    colour: "r",
    statAdjustments: {
      damage: { global: { addition: 0, multiplier: 0.15 } },
    },
  },
  {
    id: "red-capstone",
    connected: ["red-2-defensive", "red-2-offensive"],
    depth: 3,
    index: -3,
    name: "Rapid Armour Calibration",
    type: "tech",
    colour: "r",
    // TODO: implement
  },
  {
    id: "green-1",
    connected: ["ship"],
    depth: 1,
    index: 0,
    name: "+10 Maximum HP; +10% Critical Strike Chance",
    type: "passive",
    colour: "g",
    statAdjustments: {
      critChance: { global: { addition: 0.1, multiplier: 0 } },
    },
  },
  {
    id: "green-2-defensive",
    connected: ["green-1"],
    depth: 2,
    index: -1,
    name: "+15% Evade Chance",
    type: "passive",
    colour: "g",
    // TODO: implement
    statAdjustments: {},
  },
  {
    id: "green-2-offensive",
    connected: ["green-1"],
    depth: 2,
    index: 1,
    name: "+15% Rate of Fire",
    type: "passive",
    colour: "g",
    statAdjustments: {
      rof: { global: { addition: 0, multiplier: 0.15 } },
    },
  },
  {
    id: "green-capstone",
    connected: ["green-2-defensive", "green-2-offensive"],
    depth: 3,
    index: 0,
    name: "Phase Shift",
    type: "tech",
    colour: "g",
    // TODO: implement
  },
  {
    id: "blue-1",
    connected: ["ship"],
    depth: 1,
    index: 3,
    name: "+10 Maximum HP; +10% Area of Effect",
    type: "passive",
    colour: "b",
    // TODO: implement
    statAdjustments: {},
  },
  {
    id: "blue-2-defensive",
    connected: ["blue-1"],
    depth: 2,
    index: 2,
    name: "+15 Shields",
    type: "passive",
    colour: "b",
    // TODO: implement
    statAdjustments: {},
  },
  {
    id: "blue-2-offensive",
    connected: ["blue-1"],
    depth: 2,
    index: 4,
    name: "+15% Tech Recovery",
    type: "passive",
    colour: "b",
    // TODO: implement
    statAdjustments: {},
  },
  {
    id: "blue-capstone",
    connected: ["blue-2-defensive", "blue-2-offensive"],
    depth: 3,
    index: 3,
    name: "Short-Range Electomagnetic Pulse",
    type: "tech",
    colour: "b",
    // TODO: implement
  },
];
