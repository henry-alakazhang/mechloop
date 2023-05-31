import { missileLauncher, shotgun } from "../../../data/weapons";
import { SkillTree } from "../skill-tree.model";

export const tier1red: SkillTree = [
  {
    id: "t1-red|base",
    connected: [],
    index: 0,
    depth: 0,
    colour: "r",
    type: "weapon",
    weapon: missileLauncher,
  },
  {
    id: "t1-red|damage-boost",
    connected: ["t1-red|base"],
    index: -2,
    depth: 1,
    colour: "r",
    type: "passive",
    name: "Weapons Boost",
    statAdjustments: {
      damage: { global: { multiplier: 0.1 } },
      rof: { global: { multiplier: 0.08 } },
    },
  },
  {
    id: "t1-red|mixed-damage",
    connected: ["t1-red|damage-boost"],
    index: -3,
    depth: 2,
    colour: "r",
    type: "passive",
    name: "Technical Cross-Pollination",
    statAdjustments: {
      damage: {
        kinetic: { multiplier: 0.1 },
        explosive: { multiplier: 0.1 },
        energy: { multiplier: 0.1 },
      },
    },
  },
  {
    id: "t1-red|kinetic-boost",
    connected: ["t1-red|mixed-damage"],
    index: -4,
    depth: 3,
    colour: "g", // TODO: hybrid
    type: "passive",
    name: "Kinetic Damage",
    statAdjustments: {
      damage: { kinetic: { multiplier: 0.2 } },
      // other small bonus - range? RoF? proj speed?
    },
  },
  {
    id: "t1-red|kinetic-pierce",
    connected: ["t1-red|kinetic-boost"],
    index: -4,
    depth: 4,
    colour: "g",
    type: "passive",
    name: "Piercing Kinetics",
    statAdjustments: {
      projectileHP: { kinetic: { addition: 1 } },
      damage: { kinetic: { multiplier: 0.1 } },
    },
  },
  {
    id: "t1-red|explosive-boost",
    connected: ["t1-red|mixed-damage"],
    index: -3,
    depth: 3,
    colour: "r",
    type: "passive",
    name: "Explosive Damage",
    statAdjustments: {
      damage: { explosive: { multiplier: 0.2 } },
      // other small bonus - armour? AoE? proj speed?
    },
  },
  {
    id: "t1-red|explosive-cluster",
    connected: ["t1-red|explosive-boost"],
    index: -3,
    depth: 4,
    colour: "r",
    type: "passive",
    name: "Clustering Explosives",
    statAdjustments: {
      projectileHP: { explosive: { addition: 1 } },
      damage: { explosive: { multiplier: 0.1 } },
    },
  },
  {
    id: "t1-red|energy-boost",
    connected: ["t1-red|mixed-damage"],
    index: -2,
    depth: 3,
    colour: "b", // TODO: hybrid
    type: "passive",
    name: "Energy Damage",
    statAdjustments: {
      damage: { energy: { multiplier: 0.2 } },
      // other small bonus - effect duration? proj speed?
    },
  },
  {
    id: "t1-red|energy-chain",
    connected: ["t1-red|energy-boost"],
    index: -2,
    depth: 4,
    colour: "b",
    type: "passive",
    name: "Chaining Energy",
    statAdjustments: {
      projectileHP: { energy: { addition: 1 } },
      damage: { energy: { multiplier: 0.1 } },
    },
  },
  {
    id: "t1-red|armour-boost",
    connected: ["t1-red|base"],
    index: 2,
    depth: 1,
    colour: "r",
    type: "passive",
    name: "Armour Boost",
    statAdjustments: {
      damage: { global: { multiplier: 0.1 } },
      armour: { global: { multiplier: 0.08 } },
    },
  },
  {
    id: "t1-red|life-to-armour",
    connected: ["t1-red|armour-boost"],
    index: 2,
    depth: 2,
    colour: "r",
    type: "passive",
    name: "Armour Conversion",
    statAdjustments: {
      // TODO: 10% of life as armour
    },
  },
  {
    id: "t1-red|armour-class",
    connected: ["t1-red|life-to-armour"],
    index: 4,
    depth: 2,
    colour: "r",
    type: "passive",
    name: "Armour Integrity +",
    statAdjustments: {
      armour: { global: { addition: 10 } },
      armourClass: { global: { addition: 1 } },
    },
  },
  {
    id: "t1-red|collision-damage-transfer",
    connected: ["t1-red|armour-class"],
    index: 4,
    depth: 1,
    colour: "r",
    type: "passive",
    name: "Momentum",
    statAdjustments: {
      // TODO: transfer collision damage to enemy
    },
  },
  {
    id: "t1-red|area-boost",
    connected: ["t1-red|life-to-armour"],
    index: 2,
    depth: 3,
    colour: "r",
    type: "passive",
    name: "Heavy Ordinance",
    statAdjustments: {
      effectSize: { area: { multiplier: 0.15 } },
      damage: { area: { multiplier: 0.1 } },
    },
  },
  {
    id: "t1-red|flamethrower",
    connected: ["t1-red|area-boost"],
    index: 2,
    depth: 4,
    colour: "r",
    type: "tech",
    tech: {} as any,
  },
  {
    id: "t1-red|reinforce-buff",
    connected: ["t1-red|area-boost", "t1-red|armour-class"],
    index: 4,
    depth: 3,
    colour: "r",
    type: "passive",
    name: "Armour Reinforcement +",
    statAdjustments: {},
  },
  {
    id: "t1-red|life-and-life-on-kill",
    connected: ["t1-red|life-to-armour", "t1-red|mixed-damage"],
    index: 0,
    depth: 2,
    colour: "r",
    type: "passive",
    name: "Salvage Nanomachines",
    statAdjustments: {
      maxHP: { global: { multiplier: 0.15 } },
      // TODO: life gain on kill
    },
  },
  {
    id: "t1-red|shotgun",
    connected: ["t1-red|life-and-life-on-kill"],
    index: 0,
    depth: 3,
    colour: "r",
    type: "weapon",
    weapon: shotgun,
  },
  {
    id: "t1-red|multiproj",
    connected: ["t1-red|shotgun"],
    index: 0,
    depth: 4,
    colour: "r",
    type: "passive",
    name: "Spray and Pray",
    statAdjustments: {
      // TODO:
      // 33% more projectiles
      // +33 base inaccuracy
    },
  },
];
