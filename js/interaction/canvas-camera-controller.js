import {
  canvasStagePoint,
  defaultCanvasCameraState,
  pannedCanvasCameraState,
  zoomedCanvasCameraState,
} from "../ui/canvas-camera.js";

const GRID_MAJOR_SIZE = 288;
const GRID_MINOR_SIZE = 72;

export function createCanvasCameraController(canvasElement, stageElement) {
  const cameraRuntime = {
    panDrag: null,
    state: defaultCanvasCameraState(),
  };

  applyCanvasCamera(canvasElement, stageElement, cameraRuntime.state);

  return {
    beginPan: (event) => beginCameraPan(event, canvasElement, cameraRuntime),
    endPan: () => endCameraPan(canvasElement, cameraRuntime),
    scale: () => cameraRuntime.state.zoom,
    stagePointFor: (clientX, clientY) => canvasStagePoint(
      clientX,
      clientY,
      canvasElement.getBoundingClientRect(),
      cameraRuntime.state,
    ),
    updatePan: (event) => updateCameraPan(event, canvasElement, stageElement, cameraRuntime),
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
