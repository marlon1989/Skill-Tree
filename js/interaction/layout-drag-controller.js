import {
  freezeMasteryHubLayout,
  moveConnectionControl,
  moveMasteryHub,
  moveNodeLayout,
  persistCurrentState,
  state,
} from "../state.js";
import {
  edgePointToward,
  masteryHubControlPoint,
  midpointControlPoint,
  quadraticSvgPath,
} from "../ui/svg-path-geometry.js";

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
  scheduleDragFrame(dragState);
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

function scheduleDragFrame(dragState) {
  if (dragState.renderFrameId !== null) {
    return;
  }

  dragState.renderFrameId = window.requestAnimationFrame(() => {
    dragState.renderFrameId = null;
    renderActiveDragFrame(dragState.activeDrag);
  });
}

function flushScheduledRender(dragState, renderApp) {
  if (dragState.renderFrameId !== null) {
    window.cancelAnimationFrame(dragState.renderFrameId);
    dragState.renderFrameId = null;
  }

  renderApp();
}

function renderActiveDragFrame(activeDrag) {
  if (!activeDrag) {
    return;
  }

  if (activeDrag.type === "node") {
    refreshNodeConnectionPaths(activeDrag.nodeId);
    return;
  }

  if (activeDrag.type === "connection") {
    refreshConnectionPath(activeDrag.nodeId);
    return;
  }

  refreshMasteryHubConnectionPath(activeDrag.masteryHubId);
}

function refreshNodeConnectionPaths(nodeId) {
  refreshConnectionPath(nodeId);
  refreshRootMasteryHubPath(nodeId);
  refreshNodeMasterySourcePath(nodeId);

  document.querySelectorAll(`[data-node-parent-id="${escapedSelectorValue(nodeId)}"]`)
    .forEach((childElement) => {
      refreshConnectionPath(childElement.dataset.nodeId);
    });
}

function refreshRootMasteryHubPath(nodeId) {
  const selectorValue = escapedSelectorValue(nodeId);
  const masteryHubElement = document.querySelector(`[data-mastery-root-id="${selectorValue}"]`);
  const rootElement = document.querySelector(`[data-node-id="${selectorValue}"]`);

  if (!masteryHubElement || !rootElement) {
    return;
  }

  setMasteryHubPath(
    masteryHubElement.dataset.masteryHubId,
    masteryHubPathFor(masteryHubElement, rootElement),
  );
}

function refreshNodeMasterySourcePath(nodeId) {
  const nodeElement = document.querySelector(`[data-node-id="${escapedSelectorValue(nodeId)}"]`);
  const masteryHubId = nodeElement?.dataset.nodeSourceMasteryHubId;
  const masteryHubElement = document.querySelector(
    `[data-mastery-hub-id="${escapedSelectorValue(masteryHubId)}"]`,
  );

  if (!nodeElement || !masteryHubElement) {
    return;
  }

  setMasterySourcePath(nodeId, masteryHubPathFor(masteryHubElement, nodeElement));
}

function refreshConnectionPath(childNodeId) {
  const childElement = document.querySelector(`[data-node-id="${escapedSelectorValue(childNodeId)}"]`);

  if (!childElement?.dataset.nodeParentId) {
    return;
  }

  const parentElement = document.querySelector(
    `[data-node-id="${escapedSelectorValue(childElement.dataset.nodeParentId)}"]`,
  );

  if (!parentElement) {
    return;
  }

  setConnectionPath(childNodeId, connectionPathFor(parentElement, childElement, childNodeId));
}

function refreshMasteryHubConnectionPath(masteryHubId) {
  const masteryHubElement = document.querySelector(
    `[data-mastery-hub-id="${escapedSelectorValue(masteryHubId)}"]`,
  );

  if (!masteryHubElement) {
    return;
  }

  const rootElement = document.querySelector(
    `[data-node-id="${escapedSelectorValue(masteryHubElement.dataset.masteryRootId)}"]`,
  );

  if (rootElement) {
    setMasteryHubPath(masteryHubId, masteryHubPathFor(masteryHubElement, rootElement));
  }

  refreshMasteryHubSourcePaths(masteryHubId, masteryHubElement);
}

function refreshMasteryHubSourcePaths(masteryHubId, masteryHubElement) {
  document.querySelectorAll(`[data-node-source-mastery-hub-id="${escapedSelectorValue(masteryHubId)}"]`)
    .forEach((sourceNodeElement) => {
      setMasterySourcePath(
        sourceNodeElement.dataset.nodeId,
        masteryHubPathFor(masteryHubElement, sourceNodeElement),
      );
    });
}

function setConnectionPath(childNodeId, pathValue) {
  const selectorValue = escapedSelectorValue(childNodeId);

  document.querySelector(`[data-connection-node-id="${selectorValue}"]`)
    ?.setAttribute("d", pathValue);
  document.querySelector(`[data-connection-shadow-node-id="${selectorValue}"]`)
    ?.setAttribute("d", pathValue);
}

function setMasteryHubPath(masteryHubId, pathValue) {
  document.querySelector(`[data-mastery-hub-link="${escapedSelectorValue(masteryHubId)}"]`)
    ?.setAttribute("d", pathValue);
  document.querySelector(`[data-mastery-hub-link-shadow="${escapedSelectorValue(masteryHubId)}"]`)
    ?.setAttribute("d", pathValue);
}

function setMasterySourcePath(nodeId, pathValue) {
  document.querySelector(`[data-mastery-source-link="${escapedSelectorValue(nodeId)}"]`)
    ?.setAttribute("d", pathValue);
  document.querySelector(`[data-mastery-source-link-shadow="${escapedSelectorValue(nodeId)}"]`)
    ?.setAttribute("d", pathValue);
}

function connectionPathFor(parentElement, childElement, childNodeId) {
  const parentCenter = elementCenterPoint(parentElement);
  const childCenter = elementCenterPoint(childElement);
  const startPoint = edgePointToward(parentCenter, childCenter, elementSize(parentElement));
  const endPoint = edgePointToward(childCenter, parentCenter, elementSize(childElement));
  const controlPoint = connectionControlPoint(startPoint, endPoint, childNodeId);

  return quadraticSvgPath(startPoint, controlPoint, endPoint);
}

function masteryHubPathFor(masteryHubElement, rootElement) {
  const startPoint = elementCenterPoint(masteryHubElement);
  const endPoint = elementCenterPoint(rootElement);
  const controlPoint = masteryHubControlPoint(startPoint, endPoint);

  return quadraticSvgPath(startPoint, controlPoint, endPoint);
}

function connectionControlPoint(startPoint, endPoint, childNodeId) {
  const nodeSnapshot = state.nodesById[childNodeId] ?? {};

  return midpointControlPoint(startPoint, endPoint, {
    x: nodeSnapshot.connectionControlOffsetX,
    y: nodeSnapshot.connectionControlOffsetY,
  });
}

function elementCenterPoint(element) {
  const left = numericStylePosition(element, "left");
  const top = numericStylePosition(element, "top");
  const size = elementSize(element);

  return { x: left + size / 2, y: top + size / 2 };
}

function elementSize(element) {
  const styledSize = Number.parseFloat(element.style.width || element.style.height || "0");

  return styledSize || element.offsetWidth || 0;
}

function escapedSelectorValue(value) {
  const rawValue = String(value ?? "");

  if (typeof window.CSS?.escape === "function") {
    return window.CSS.escape(rawValue);
  }

  return rawValue.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
