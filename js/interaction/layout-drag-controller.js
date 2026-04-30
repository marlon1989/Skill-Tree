import { freezeMasteryHubLayout, moveConnectionControl, moveMasteryHub, moveNodeLayout, state } from "../state.js";

const MIN_NODE_POSITION = 12;

export function createLayoutDragController(renderApp, currentScale = () => 1) {
  const dragState = {
    activeDrag: null,
    didMove: false,
    suppressClickUntil: 0,
  };

  return {
    beginConnectionDrag: (event, nodeId) => beginConnectionDrag(event, nodeId, dragState),
    beginMasteryHubDrag: (event, masteryHubId, masteryHubElement) =>
      beginMasteryHubDrag(event, masteryHubId, masteryHubElement, dragState),
    beginNodeDrag: (event, nodeId, nodeElement) => beginNodeDrag(event, nodeId, nodeElement, dragState),
    end: () => endDrag(dragState),
    suppressesClick: () => dragState.suppressClickUntil > Date.now(),
    update: (event) => updateDrag(event, dragState, renderApp, currentScale),
  };
}

function beginConnectionDrag(event, nodeId, dragState) {
  event.preventDefault();
  event.stopPropagation();

  dragState.activeDrag = {
    initialOffsetX: Number(state.nodesById[nodeId]?.connectionControlOffsetX ?? 0),
    initialOffsetY: Number(state.nodesById[nodeId]?.connectionControlOffsetY ?? 0),
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
  freezeLinkedMasteryHub(nodeId, nodeElement);

  dragState.activeDrag = {
    initialLeft: nodeElement.offsetLeft,
    initialOffsetX: Number(state.nodesById[nodeId]?.layoutOffsetX ?? 0),
    initialOffsetY: Number(state.nodesById[nodeId]?.layoutOffsetY ?? 0),
    initialTop: nodeElement.offsetTop,
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
    masteryHubId,
    startX: event.clientX,
    startY: event.clientY,
    type: "mastery-hub",
  };
  dragState.didMove = false;
}

function endDrag(dragState) {
  if (dragState.didMove) {
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

  if (dragState.activeDrag.type === "node") {
    updateNodePosition(dragState.activeDrag, deltaX, deltaY);
  } else if (dragState.activeDrag.type === "connection") {
    moveConnectionControl(
      dragState.activeDrag.nodeId,
      dragState.activeDrag.initialOffsetX + deltaX,
      dragState.activeDrag.initialOffsetY + deltaY,
    );
  } else {
    updateMasteryHubPosition(dragState.activeDrag, deltaX, deltaY);
  }

  dragState.didMove = true;
  renderApp();
}

function updateMasteryHubPosition(activeDrag, deltaX, deltaY) {
  const nextLeft = Math.max(MIN_NODE_POSITION, activeDrag.initialLeft + deltaX);
  const nextTop = Math.max(MIN_NODE_POSITION, activeDrag.initialTop + deltaY);

  moveMasteryHub(activeDrag.masteryHubId, nextLeft, nextTop);
}

function updateNodePosition(activeDrag, deltaX, deltaY) {
  const nextAbsoluteLeft = Math.max(MIN_NODE_POSITION, activeDrag.initialLeft + deltaX);
  const nextAbsoluteTop = Math.max(MIN_NODE_POSITION, activeDrag.initialTop + deltaY);

  moveNodeLayout(
    activeDrag.nodeId,
    activeDrag.initialOffsetX + (nextAbsoluteLeft - activeDrag.initialLeft),
    activeDrag.initialOffsetY + (nextAbsoluteTop - activeDrag.initialTop),
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
  );
}

function numericStylePosition(element, propertyName) {
  return Number.parseFloat(element.style[propertyName] || "0") || 0;
}
