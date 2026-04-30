import { getBossQuestion, handleBossFight } from "./boss.js";
import { initializeInteractions } from "./interaction.js";
import { renderApp } from "./render.js";

initializeInteractions({
  getBossQuestion,
  handleBossFight,
  renderApp,
});

let resizeRenderFrameId = null;

window.addEventListener("resize", scheduleResizeRender);

function scheduleResizeRender() {
  if (resizeRenderFrameId !== null) {
    return;
  }

  resizeRenderFrameId = window.requestAnimationFrame(() => {
    resizeRenderFrameId = null;
    renderApp();
  });
}
