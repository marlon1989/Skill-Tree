import { getBossQuestion, handleBossFight } from "./boss.js";
import { initializeInteractions } from "./interaction.js";
import { renderApp } from "./render.js";

initializeInteractions({
  getBossQuestion,
  handleBossFight,
  renderApp,
});

window.addEventListener("resize", () => {
  renderApp();
});
