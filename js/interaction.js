import { state } from "./state.js";
import { hideBossModal, hideContextMenu, hideHoverModal, showBossModal, showContextMenu, showHoverModal } from "./ui.js";
import { createCanvasCameraController } from "./interaction/canvas-camera-controller.js";
import { createContextActionRunner } from "./interaction/context-actions.js";
import { createHoldController } from "./interaction/hold-controller.js";
import { createLayoutDragController } from "./interaction/layout-drag-controller.js";
import { victorySfx, playVictorySfx } from "./interaction/audio-victory.js";
import { canAdvanceNode, canOpenBossModal } from "./interaction/node-rules.js";

export { playVictorySfx, victorySfx };

export function initializeInteractions({ getBossQuestion, handleBossFight, renderApp }) {
  const elements = captureElements();
  const canvasCameraController = createCanvasCameraController(elements.canvas, elements.stage);
  const holdController = createHoldController(renderApp);
  const layoutDragController = createLayoutDragController(renderApp, canvasCameraController.scale);
  const contextActionRunner = createContextActionRunner(renderApp);

  elements.canvas.addEventListener("pointerdown", (event) => {
    canvasCameraController.beginPan(event);
  });

  elements.canvas.addEventListener("auxclick", (event) => {
    if (event.button === 1) {
      event.preventDefault();
    }
  });

  elements.canvas.addEventListener("wheel", (event) => {
    canvasCameraController.zoomFromWheel(event);
  }, { passive: false });

  elements.nodeLayer.addEventListener("pointerdown", (event) => {
    const nodeDragHandle = event.target.closest("[data-node-drag-handle]");
    const connectionHandle = event.target.closest("[data-connection-handle]");

    if (nodeDragHandle) {
      const nodeId = nodeDragHandle.dataset.dragNodeId;
      const nodeElement = nodeDragHandle.closest("[data-node-id]");

      if (!nodeId || !nodeElement) {
        return;
      }

      layoutDragController.beginNodeDrag(event, nodeId, nodeElement);
      return;
    }

    if (connectionHandle) {
      const nodeId = connectionHandle.dataset.connectionNodeId;

      if (!nodeId) {
        return;
      }

      layoutDragController.beginConnectionDrag(event, nodeId);
      return;
    }

    const nodeElement = event.target.closest("[data-node-id]");

    if (!nodeElement || event.button !== 0) {
      return;
    }

    const nodeId = nodeElement.dataset.nodeId;
    const node = state.nodesById[nodeId];

    if (!canAdvanceNode(node)) {
      return;
    }

    holdController.begin(event, nodeId);
  });

  document.addEventListener("pointerup", () => {
    canvasCameraController.endPan();
    holdController.end();
    layoutDragController.end();
  });

  document.addEventListener("pointercancel", () => {
    canvasCameraController.endPan();
    holdController.end();
    layoutDragController.end();
  });

  document.addEventListener("pointermove", (event) => {
    canvasCameraController.updatePan(event);
    layoutDragController.update(event);
  });

  elements.nodeLayer.addEventListener("click", (event) => {
    const nodeElement = event.target.closest("[data-node-id]");

    if (!nodeElement) {
      return;
    }

    if (holdController.suppressesClick() || layoutDragController.suppressesClick()) {
      return;
    }

    const nodeId = nodeElement.dataset.nodeId;
    const node = state.nodesById[nodeId];

    if (!canOpenBossModal(node)) {
      return;
    }

    showBossModal(nodeId, getBossQuestion(nodeId));
  });

  elements.nodeLayer.addEventListener("pointerover", (event) => {
    const nodeElement = event.target.closest("[data-node-id]");

    if (!nodeElement) {
      return;
    }

    showHoverModal(event.clientX + 18, event.clientY + 18, hoverContentOf(nodeElement));
  });

  elements.nodeLayer.addEventListener("pointermove", (event) => {
    const nodeElement = event.target.closest("[data-node-id]");

    if (!nodeElement) {
      return;
    }

    showHoverModal(event.clientX + 18, event.clientY + 18, hoverContentOf(nodeElement));
  });

  elements.nodeLayer.addEventListener("pointerout", (event) => {
    const nodeElement = event.target.closest("[data-node-id]");
    const nextNodeElement = event.relatedTarget?.closest?.("[data-node-id]");

    if (!nodeElement || nodeElement === nextNodeElement) {
      return;
    }

    hideHoverModal();
  });

  elements.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    const masteryHubElement = event.target.closest("[data-mastery-hub-id]");
    const nodeElement = event.target.closest("[data-node-id]");
    const masteryHubId = masteryHubElement?.dataset.masteryHubId ?? "";
    const nodeId = nodeElement?.dataset.nodeId ?? "";
    const isRootNode = nodeId !== "" && state.nodesById[nodeId]?.parentId === null;
    const clickPoint = nodeElement || masteryHubElement
      ? null
      : canvasCameraController.stagePointFor(event.clientX, event.clientY);

    showContextMenu(event.clientX, event.clientY, nodeId, masteryHubId, isRootNode, clickPoint);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#context-menu")) {
      return;
    }

    hideContextMenu();
    !event.target.closest("[data-node-id]") && hideHoverModal();
  });

  elements.contextMenu.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.action;
    const masteryHubId = elements.contextMenu.dataset.masteryHubId || "";
    const nodeId = elements.contextMenu.dataset.nodeId || "";
    const contextInput = {
      canvasX: Number(elements.contextMenu.dataset.canvasX || 0),
      canvasY: Number(elements.contextMenu.dataset.canvasY || 0),
      masteryHubId,
      nodeId,
    };

    hideContextMenu();
    contextActionRunner.run(action, contextInput);
  });

  elements.bossOptions.addEventListener("click", (event) => {
    const optionButton = event.target.closest("[data-choice]");

    if (!optionButton) {
      return;
    }

    setSelectedBossOption(elements.bossModal, elements.bossOptions, optionButton.dataset.choice);
  });

  elements.bossConfirm.addEventListener("click", () => {
    const nodeId = elements.bossModal.dataset.nodeId;
    const selectedAnswer = elements.bossModal.dataset.selectedChoice;

    if (!nodeId) {
      hideBossModal();
      return;
    }

    if (selectedAnswer === undefined || selectedAnswer === "") {
      window.alert("Selecione uma resposta antes de confirmar.");
      return;
    }

    handleBossFight(nodeId, selectedAnswer);
  });

  elements.bossModal.addEventListener("click", (event) => {
    if (event.target === elements.bossModal) {
      hideBossModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      holdController.end();
      hideBossModal();
      hideContextMenu();
      hideHoverModal();
    }
  });

  renderApp();
}

function captureElements() {
  return {
    bossConfirm: document.getElementById("boss-modal-confirm"),
    bossModal: document.getElementById("boss-modal"),
    bossOptions: document.getElementById("boss-modal-options"),
    canvas: document.getElementById("skill-tree-canvas"),
    contextMenu: document.getElementById("context-menu"),
    nodeLayer: document.getElementById("tree-node-layer"),
    stage: document.getElementById("tree-stage"),
  };
}

function hoverContentOf(nodeElement) {
  return {
    status: nodeElement.dataset.nodeStatusLabel || nodeElement.dataset.nodeStatus || "",
    title: nodeElement.dataset.nodeTitle || "",
  };
}

function setSelectedBossOption(modalElement, optionsContainer, selectedChoice) {
  modalElement.dataset.selectedChoice = String(selectedChoice);

  optionsContainer.querySelectorAll("[data-choice]").forEach((button) => {
    const isSelected = button.dataset.choice === String(selectedChoice);

    button.classList.toggle("border-blue-500", isSelected);
    button.classList.toggle("bg-blue-50", isSelected);
    button.classList.toggle("text-blue-800", isSelected);
  });
}
