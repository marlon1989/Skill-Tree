import {
  freezeMasteryHubLayout,
  moveConnectionControl,
  moveMasteryHub,
  moveNodeLayout,
  persistCurrentState,
  state,
} from "../state.js";

const MIN_NODE_POSITION = 12;
const TRANSIENT_DRAG_OPTIONS = Object.freeze({ persistState: false });

export function createLayoutDragController(renderApp, currentScale = () => 1) {
  const dragState = {
    activeDrag: null,
    didMove: false,
    renderFrameId: null,
    suppressClickUntil: 0,
  };

  return {
    beginConnectionDrag: (event, nodeId, handleElement) =>
      beginConnectionDrag(event, nodeId, handleElement, dragState),
    beginMasteryHubDrag: (event, masteryHubId, masteryHubElement) =>
      beginMasteryHubDrag(event, masteryHubId, masteryHubElement, dragState),
    beginNodeDrag: (event, nodeId, nodeElement) => beginNodeDrag(event, nodeId, nodeElement, dragState),
    end: () => endDrag(dragState, renderApp),
    suppressesClick: () => dragState.suppressClickUntil > Date.now(),
    update: (event) => updateDrag(event, dragState, renderApp, currentScale),
  };
}

function beginConnectionDrag(event, nodeId, handleElement, dragState) {
  event.preventDefault();
  event.stopPropagation();

  dragState.activeDrag = {
    handleElement,
    initialLeft: numericStylePosition(handleElement, "left"),
    initialOffsetX: Number(state.nodesById[nodeId]?.connectionControlOffsetX ?? 0),
    initialOffsetY: Number(state.nodesById[nodeId]?.connectionControlOffsetY ?? 0),
    initialTop: numericStylePosition(handleElement, "top"),
    nodeId,
    startX: event.clientX,
    startY: event.clientY,
    type: "connection",
  };
  dragState.didMove = false;
}

function beginNodeDrag(event, nodeId, nodeElement, dragState) {
  event.preventDefault();
  event.stopPropagation();

  dragState.activeDrag = {
    hasFrozenMasteryHub: false,
    initialLeft: nodeElement.offsetLeft,
    initialOffsetX: Number(state.nodesById[nodeId]?.layoutOffsetX ?? 0),
    initialOffsetY: Number(state.nodesById[nodeId]?.layoutOffsetY ?? 0),
    initialTop: nodeElement.offsetTop,
    nodeElement,
    nodeId,
    startX: event.clientX,
    startY: event.clientY,
    type: "node",
  };
  dragState.didMove = false;
}

function beginMasteryHubDrag(event, masteryHubId, masteryHubElement, dragState) {
  event.preventDefault();
  event.stopPropagation();

  dragState.activeDrag = {
    initialLeft: numericStylePosition(masteryHubElement, "left"),
    initialTop: numericStylePosition(masteryHubElement, "top"),
    masteryHubElement,
    masteryHubId,
    startX: event.clientX,
    startY: event.clientY,
    type: "mastery-hub",
  };
  dragState.didMove = false;
}

function endDrag(dragState, renderApp) {
  if (dragState.didMove) {
    flushScheduledRender(dragState, renderApp);
    persistCurrentState();
    dragState.suppressClickUntil = Date.now() + 250;
  }

  dragState.activeDrag = null;
  dragState.didMove = false;
}

function updateDrag(event, dragState, renderApp, currentScale) {
  if (!dragState.activeDrag) {
    return;
  }

  const viewportScale = Math.max(0.01, Number(currentScale()) || 1);
  const deltaX = (event.clientX - dragState.activeDrag.startX) / viewportScale;
  const deltaY = (event.clientY - dragState.activeDrag.startY) / viewportScale;

  if (!hasMeaningfulDelta(deltaX, deltaY)) {
    return;
  }

  if (dragState.activeDrag.type === "node") {
    updateNodePosition(dragState.activeDrag, deltaX, deltaY);
  } else if (dragState.activeDrag.type === "connection") {
    updateConnectionPosition(dragState.activeDrag, deltaX, deltaY);
  } else {
    updateMasteryHubPosition(dragState.activeDrag, deltaX, deltaY);
  }

  dragState.didMove = true;
  scheduleDragRender(dragState, renderApp);
}

function updateMasteryHubPosition(activeDrag, deltaX, deltaY) {
  const nextLeft = Math.max(MIN_NODE_POSITION, activeDrag.initialLeft + deltaX);
  const nextTop = Math.max(MIN_NODE_POSITION, activeDrag.initialTop + deltaY);

  activeDrag.masteryHubElement.style.left = `${nextLeft}px`;
  activeDrag.masteryHubElement.style.top = `${nextTop}px`;
  moveMasteryHub(activeDrag.masteryHubId, nextLeft, nextTop, TRANSIENT_DRAG_OPTIONS);
}

function updateNodePosition(activeDrag, deltaX, deltaY) {
  const nextAbsoluteLeft = Math.max(MIN_NODE_POSITION, activeDrag.initialLeft + deltaX);
  const nextAbsoluteTop = Math.max(MIN_NODE_POSITION, activeDrag.initialTop + deltaY);

  if (!activeDrag.hasFrozenMasteryHub) {
    freezeLinkedMasteryHub(activeDrag.nodeId, activeDrag.nodeElement);
    activeDrag.hasFrozenMasteryHub = true;
  }

  activeDrag.nodeElement.style.left = `${nextAbsoluteLeft}px`;
  activeDrag.nodeElement.style.top = `${nextAbsoluteTop}px`;
  moveNodeLayout(
    activeDrag.nodeId,
    activeDrag.initialOffsetX + (nextAbsoluteLeft - activeDrag.initialLeft),
    activeDrag.initialOffsetY + (nextAbsoluteTop - activeDrag.initialTop),
    TRANSIENT_DRAG_OPTIONS,
  );
}

function updateConnectionPosition(activeDrag, deltaX, deltaY) {
  const nextLeft = activeDrag.initialLeft + deltaX;
  const nextTop = activeDrag.initialTop + deltaY;

  activeDrag.handleElement.style.left = `${nextLeft}px`;
  activeDrag.handleElement.style.top = `${nextTop}px`;
  moveConnectionControl(
    activeDrag.nodeId,
    activeDrag.initialOffsetX + deltaX,
    activeDrag.initialOffsetY + deltaY,
    TRANSIENT_DRAG_OPTIONS,
  );
}

function freezeLinkedMasteryHub(nodeId, nodeElement) {
  if (state.nodesById[nodeId]?.parentId !== null) {
    return;
  }

  const masteryHubElement = nodeElement.parentElement?.querySelector(
    `[data-mastery-root-id="${nodeId}"]`,
  );

  if (!masteryHubElement) {
    return;
  }

  freezeMasteryHubLayout(
    nodeId,
    numericStylePosition(masteryHubElement, "left"),
    numericStylePosition(masteryHubElement, "top"),
    TRANSIENT_DRAG_OPTIONS,
  );
}

function numericStylePosition(element, propertyName) {
  return Number.parseFloat(element.style[propertyName] || "0") || 0;
}

function hasMeaningfulDelta(deltaX, deltaY) {
  return Math.abs(deltaX) >= 0.01 || Math.abs(deltaY) >= 0.01;
}

function scheduleDragRender(dragState, renderApp) {
  if (dragState.renderFrameId !== null) {
    return;
  }

  dragState.renderFrameId = window.requestAnimationFrame(() => {
    dragState.renderFrameId = null;
    renderApp();
  });
}

function flushScheduledRender(dragState, renderApp) {
  if (dragState.renderFrameId !== null) {
    window.cancelAnimationFrame(dragState.renderFrameId);
    dragState.renderFrameId = null;
  }

  renderApp();
}
