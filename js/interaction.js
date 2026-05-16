import { state } from "./state.js";
import { hideBossModal, hideContextMenu, hideHoverModal, showBossModal, showContextMenu, showHoverModal } from "./ui.js";
import { createCanvasCameraController } from "./interaction/canvas-camera-controller.js";
import { createContextActionRunner } from "./interaction/context-actions.js";
import { createHoldController } from "./interaction/hold-controller.js";
import { createLayoutDragController } from "./interaction/layout-drag-controller.js";
import { victorySfx, playVictorySfx } from "./interaction/audio-victory.js";
import { canAdvanceNode, canOpenBossModal } from "./interaction/node-rules.js";
import { hideThemeAlert, showThemeAlert } from "./ui/theme-alert.js";

export { playVictorySfx, victorySfx };

export function initializeInteractions({ getBossQuestion, handleBossFight, renderApp }) {
  const elements = captureElements();
  const canvasCameraController = createCanvasCameraController(elements.canvas, elements.stage);
  const holdController = createHoldController(renderApp);
  const layoutDragController = createLayoutDragController(renderApp, canvasCameraController.scale);
  const contextActionRunner = createContextActionRunner(renderApp);
  const hoverPreviewController = createHoverPreviewController();

  elements.canvasActionBar.addEventListener("click", (event) => {
    runCanvasToolbarAction(event, elements, canvasCameraController, contextActionRunner);
  });

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
    const masteryHubElement = event.target.closest("[data-mastery-hub-id]");

    if (masteryHubElement && event.button === 0) {
      const masteryHubId = masteryHubElement.dataset.masteryHubId;

      if (!masteryHubId) {
        return;
      }

      layoutDragController.beginMasteryHubDrag(event, masteryHubId, masteryHubElement);
      return;
    }

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

      layoutDragController.beginConnectionDrag(event, nodeId, connectionHandle);
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

    hoverPreviewController.show(event, nodeElement);
  });

  elements.nodeLayer.addEventListener("pointermove", (event) => {
    const nodeElement = event.target.closest("[data-node-id]");

    if (!nodeElement) {
      return;
    }

    hoverPreviewController.show(event, nodeElement);
  });

  elements.nodeLayer.addEventListener("pointerout", (event) => {
    const nodeElement = event.target.closest("[data-node-id]");
    const nextNodeElement = event.relatedTarget?.closest?.("[data-node-id]");

    if (!nodeElement || nodeElement === nextNodeElement) {
      return;
    }

    hoverPreviewController.hide();
  });

  elements.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    const masteryHubElement = event.target.closest("[data-mastery-hub-id]");
    const nodeElement = event.target.closest("[data-node-id]");
    const masteryHubId = masteryHubElement?.dataset.masteryHubId ?? "";
    const nodeId = nodeElement?.dataset.nodeId ?? "";
    const isRootNode = nodeId !== "" && state.nodesById[nodeId]?.nodeKind === "origin";
    const clickPoint = canvasCameraController.stagePointFor(event.clientX, event.clientY);

    showContextMenu(event.clientX, event.clientY, nodeId, masteryHubId, isRootNode, clickPoint);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#context-menu")) {
      return;
    }

    hideContextMenu();
    !event.target.closest("[data-node-id]") && hoverPreviewController.hide();
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

    if (elements.bossOptions.children.length === 0) {
      handleBossFight(nodeId, "");
      return;
    }

    if (selectedAnswer === undefined || selectedAnswer === "") {
      showThemeAlert("Selecione uma resposta antes de confirmar.");
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
      hoverPreviewController.hide();
      hideThemeAlert();
    }
  });

  renderApp();
  window.requestAnimationFrame(() => {
    canvasCameraController.fitInitialTree();
  });
}

function captureElements() {
  return {
    canvasActionBar: document.getElementById("canvas-action-bar"),
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

async function runCanvasToolbarAction(event, elements, canvasCameraController, contextActionRunner) {
  const toolButton = event.target.closest("[data-canvas-tool]");

  if (!toolButton) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  await canvasToolAction(toolButton.dataset.canvasTool, elements, canvasCameraController, contextActionRunner);
}

async function canvasToolAction(action, elements, canvasCameraController, contextActionRunner) {
  if (action === "fit-view") {
    canvasCameraController.fitTreeToViewport();
    return;
  }

  if (action === "zoom-in" || action === "zoom-out") {
    canvasCameraController.zoomFromControl(action === "zoom-in" ? 1.18 : 0.82);
    return;
  }

  if (action === "create-root") {
    await contextActionRunner.run("create-root", toolbarRootContext(elements.canvas, canvasCameraController));
  }
}

function toolbarRootContext(canvasElement, canvasCameraController) {
  const canvasRect = canvasElement.getBoundingClientRect();
  const centerPoint = canvasCameraController.stagePointFor(
    canvasRect.left + canvasRect.width / 2,
    canvasRect.top + canvasRect.height / 2,
  );

  return {
    canvasX: centerPoint.x,
    canvasY: centerPoint.y,
    masteryHubId: "",
    nodeId: "",
  };
}

function createHoverPreviewController() {
  const hoverPreviewState = {
    frameId: null,
    nextPreview: null,
  };

  return {
    hide: () => hideScheduledHoverPreview(hoverPreviewState),
    show: (event, nodeElement) => scheduleHoverPreview(event, nodeElement, hoverPreviewState),
  };
}

function hideScheduledHoverPreview(hoverPreviewState) {
  cancelHoverPreviewFrame(hoverPreviewState);
  hoverPreviewState.nextPreview = null;
  hideHoverModal();
}

function scheduleHoverPreview(event, nodeElement, hoverPreviewState) {
  hoverPreviewState.nextPreview = {
    content: hoverContentOf(nodeElement),
    x: event.clientX + 18,
    y: event.clientY + 18,
  };

  if (hoverPreviewState.frameId !== null) {
    return;
  }

  hoverPreviewState.frameId = window.requestAnimationFrame(() => {
    showPendingHoverPreview(hoverPreviewState);
  });
}

function showPendingHoverPreview(hoverPreviewState) {
  const nextPreview = hoverPreviewState.nextPreview;

  hoverPreviewState.frameId = null;

  if (!nextPreview) {
    return;
  }

  showHoverModal(nextPreview.x, nextPreview.y, nextPreview.content);
}

function cancelHoverPreviewFrame(hoverPreviewState) {
  if (hoverPreviewState.frameId === null) {
    return;
  }

  window.cancelAnimationFrame(hoverPreviewState.frameId);
  hoverPreviewState.frameId = null;
}

function setSelectedBossOption(modalElement, optionsContainer, selectedChoice) {
  modalElement.dataset.selectedChoice = String(selectedChoice);

  optionsContainer.querySelectorAll("[data-choice]").forEach((button) => {
    const isSelected = button.dataset.choice === String(selectedChoice);

    button.classList.toggle("border-cyan-200", isSelected);
    button.classList.toggle("bg-cyan-200/20", isSelected);
    button.classList.toggle("text-cyan-50", isSelected);
  });
}
