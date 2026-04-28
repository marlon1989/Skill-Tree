import { moveConnectionControl, moveNodeLayout, state } from "../state.js";

const MIN_NODE_POSITION = 12;

export function createLayoutDragController(renderApp, currentScale = () => 1) {
  const dragState = {
    activeDrag: null,
    didMove: false,
    suppressClickUntil: 0,
  };

  return {
    beginConnectionDrag: (event, nodeId) => beginConnectionDrag(event, nodeId, dragState),
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
  } else {
    moveConnectionControl(
      dragState.activeDrag.nodeId,
      dragState.activeDrag.initialOffsetX + deltaX,
      dragState.activeDrag.initialOffsetY + deltaY,
    );
  }

  dragState.didMove = true;
  renderApp();
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
