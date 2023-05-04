import { Application } from "pixi.js";
import { CombatScene } from "./scenes/combat.scene";

const app = new Application({
  view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  backgroundColor: 0x6495ed,
  width: 1500,
  height: 800,
});

const combatScene = new CombatScene();

combatScene.interactive = true;

app.stage.addChild(combatScene);
