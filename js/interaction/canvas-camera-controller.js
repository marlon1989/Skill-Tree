import {
  canvasStagePoint,
  defaultCanvasCameraState,
  fittedCanvasCameraState,
  pannedCanvasCameraState,
  scaledCanvasCameraState,
  zoomedCanvasCameraState,
} from "../ui/canvas-camera.js";

const GRID_MAJOR_SIZE = 288;
const GRID_MINOR_SIZE = 72;
const FIT_VIEW_PADDING = 128;
const HUB_SELECTOR = '[data-mastery-hub="true"]';
const NODE_BOTTOM_OVERHANG = 40;
const NODE_SELECTOR = "[data-node-id]";
const NODE_TOP_OVERHANG = 68;

export function createCanvasCameraController(canvasElement, stageElement) {
  const cameraRuntime = {
    didFitInitialTree: false,
    panDrag: null,
    state: defaultCanvasCameraState(),
  };

  applyCanvasCamera(canvasElement, stageElement, cameraRuntime.state);

  return {
    beginPan: (event) => beginCameraPan(event, canvasElement, cameraRuntime),
    endPan: () => endCameraPan(canvasElement, cameraRuntime),
    fitInitialTree: () => fitInitialTree(canvasElement, stageElement, cameraRuntime),
    fitTreeToViewport: () => fitTreeToViewport(canvasElement, stageElement, cameraRuntime),
    scale: () => cameraRuntime.state.zoom,
    stagePointFor: (clientX, clientY) => canvasStagePoint(
      clientX,
      clientY,
      canvasElement.getBoundingClientRect(),
      cameraRuntime.state,
    ),
    updatePan: (event) => updateCameraPan(event, canvasElement, stageElement, cameraRuntime),
    zoomFromControl: (zoomFactor) => zoomCameraFromControl(zoomFactor, canvasElement, stageElement, cameraRuntime),
    zoomFromWheel: (event) => zoomCameraFromWheel(event, canvasElement, stageElement, cameraRuntime),
  };
}

function applyCanvasCamera(canvasElement, stageElement, cameraState) {
  stageElement.style.transform =
    `translate(${cameraState.offsetX}px, ${cameraState.offsetY}px) scale(${cameraState.zoom})`;
  stageElement.style.transformOrigin = "0 0";
  stageElement.style.willChange = "transform";
  canvasElement.dataset.cameraZoom = cameraState.zoom.toFixed(3);
  canvasElement.dataset.cameraOffsetX = cameraState.offsetX.toFixed(2);
  canvasElement.dataset.cameraOffsetY = cameraState.offsetY.toFixed(2);
  applyInfiniteGrid(canvasElement, cameraState);
}

function fitInitialTree(canvasElement, stageElement, cameraRuntime) {
  if (cameraRuntime.didFitInitialTree) {
    return;
  }

  cameraRuntime.didFitInitialTree = true;
  fitTreeToViewport(canvasElement, stageElement, cameraRuntime);
}

function fitTreeToViewport(canvasElement, stageElement, cameraRuntime) {
  const contentBounds = treeContentBounds(stageElement);

  if (!contentBounds) {
    return;
  }

  const canvasRect = canvasElement.getBoundingClientRect();

  cameraRuntime.state = fittedCanvasCameraState(
    contentBounds,
    { height: canvasRect.height, width: canvasRect.width },
    FIT_VIEW_PADDING,
  );
  applyCanvasCamera(canvasElement, stageElement, cameraRuntime.state);
}

function applyInfiniteGrid(canvasElement, cameraState) {
  canvasElement.style.backgroundPosition =
    `${cameraState.offsetX}px ${cameraState.offsetY}px, ${cameraState.offsetX}px ${cameraState.offsetY}px`;
  canvasElement.style.backgroundSize =
    `${GRID_MINOR_SIZE * cameraState.zoom}px ${GRID_MINOR_SIZE * cameraState.zoom}px, ` +
    `${GRID_MAJOR_SIZE * cameraState.zoom}px ${GRID_MAJOR_SIZE * cameraState.zoom}px`;
}

function beginCameraPan(event, canvasElement, cameraRuntime) {
  if (event.button !== 1) {
    return;
  }

  event.preventDefault();
  canvasElement.classList.add("cursor-grabbing");
  cameraRuntime.panDrag = {
    startOffsetX: cameraRuntime.state.offsetX,
    startOffsetY: cameraRuntime.state.offsetY,
    startX: event.clientX,
    startY: event.clientY,
  };
}

function endCameraPan(canvasElement, cameraRuntime) {
  cameraRuntime.panDrag = null;
  canvasElement.classList.remove("cursor-grabbing");
}

function updateCameraPan(event, canvasElement, stageElement, cameraRuntime) {
  if (!cameraRuntime.panDrag) {
    return;
  }

  event.preventDefault();
  cameraRuntime.state = pannedCanvasCameraState(
    {
      offsetX: cameraRuntime.panDrag.startOffsetX,
      offsetY: cameraRuntime.panDrag.startOffsetY,
      zoom: cameraRuntime.state.zoom,
    },
    event.clientX - cameraRuntime.panDrag.startX,
    event.clientY - cameraRuntime.panDrag.startY,
  );
  applyCanvasCamera(canvasElement, stageElement, cameraRuntime.state);
}

function zoomCameraFromControl(zoomFactor, canvasElement, stageElement, cameraRuntime) {
  cameraRuntime.state = scaledCanvasCameraState(
    cameraRuntime.state,
    zoomFactor,
    canvasElement.getBoundingClientRect(),
  );
  applyCanvasCamera(canvasElement, stageElement, cameraRuntime.state);
}

function zoomCameraFromWheel(event, canvasElement, stageElement, cameraRuntime) {
  event.preventDefault();
  cameraRuntime.state = zoomedCanvasCameraState(
    cameraRuntime.state,
    event.deltaY,
    event.clientX,
    event.clientY,
    canvasElement.getBoundingClientRect(),
  );
  applyCanvasCamera(canvasElement, stageElement, cameraRuntime.state);
}

function treeContentBounds(stageElement) {
  const bounds = treeContentElements(stageElement).map(stageElementBounds).filter(Boolean);

  if (bounds.length === 0) {
    return null;
  }

  return mergedBounds(bounds);
}

function treeContentElements(stageElement) {
  return [...stageElement.querySelectorAll(`${NODE_SELECTOR}, ${HUB_SELECTOR}`)];
}

function stageElementBounds(element) {
  if (element.matches(HUB_SELECTOR)) {
    return masteryHubBounds(element);
  }

  return nodeBounds(element);
}

function nodeBounds(element) {
  const left = numericStyleValue(element.style.left);
  const top = numericStyleValue(element.style.top) - NODE_TOP_OVERHANG;
  const width = element.offsetWidth || numericStyleValue(element.style.width) || 1;
  const height = Math.max(element.offsetHeight, width) + NODE_TOP_OVERHANG + NODE_BOTTOM_OVERHANG;

  return { height, left, top, width };
}

function masteryHubBounds(element) {
  const centerX = numericStyleValue(element.style.left);
  const centerY = numericStyleValue(element.style.top);
  const size = firstChildSize(element);

  return {
    height: size,
    left: centerX - size / 2,
    top: centerY - size / 2,
    width: size,
  };
}

function firstChildSize(element) {
  const childElement = element.firstElementChild;
  const declaredWidth = numericStyleValue(childElement?.style?.width);
  const renderedWidth = childElement?.offsetWidth ?? 0;

  return Math.max(1, declaredWidth || renderedWidth);
}

function mergedBounds(bounds) {
  const left = Math.min(...bounds.map((entry) => entry.left));
  const top = Math.min(...bounds.map((entry) => entry.top));
  const right = Math.max(...bounds.map((entry) => entry.left + entry.width));
  const bottom = Math.max(...bounds.map((entry) => entry.top + entry.height));

  return { height: bottom - top, left, top, width: right - left };
}

function numericStyleValue(rawValue) {
  const numericValue = Number.parseFloat(String(rawValue ?? ""));

  return Number.isFinite(numericValue) ? numericValue : 0;
}
