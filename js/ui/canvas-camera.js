const MAXIMUM_CANVAS_ZOOM = 2.6;
const MINIMUM_CANVAS_ZOOM = 0.35;
const WHEEL_ZOOM_INTENSITY = 0.0015;

/**
 * Convert pointer viewport coordinates into transformed stage coordinates.
 * Example:
 *   canvasStagePoint(140, 120, { left: 20, top: 10 }, { offsetX: 40, offsetY: 30, zoom: 2 }).x === 40
 */
export function canvasStagePoint(clientX, clientY, canvasRect, cameraState) {
  const normalizedCamera = normalizedCameraState(cameraState);

  return {
    x: (Number(clientX) - Number(canvasRect.left) - normalizedCamera.offsetX) / normalizedCamera.zoom,
    y: (Number(clientY) - Number(canvasRect.top) - normalizedCamera.offsetY) / normalizedCamera.zoom,
  };
}

export function clampedCanvasZoom(rawZoom) {
  return Math.min(MAXIMUM_CANVAS_ZOOM, Math.max(MINIMUM_CANVAS_ZOOM, Number(rawZoom) || 1));
}

export function defaultCanvasCameraState() {
  return {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  };
}

export function pannedCanvasCameraState(cameraState, deltaX, deltaY) {
  const normalizedCamera = normalizedCameraState(cameraState);

  return {
    offsetX: normalizedCamera.offsetX + Number(deltaX),
    offsetY: normalizedCamera.offsetY + Number(deltaY),
    zoom: normalizedCamera.zoom,
  };
}

export function zoomedCanvasCameraState(cameraState, wheelDeltaY, clientX, clientY, canvasRect) {
  const normalizedCamera = normalizedCameraState(cameraState);
  const stagePoint = canvasStagePoint(clientX, clientY, canvasRect, normalizedCamera);
  const nextZoom = clampedCanvasZoom(
    normalizedCamera.zoom * Math.exp(-Number(wheelDeltaY) * WHEEL_ZOOM_INTENSITY),
  );

  return {
    offsetX: Number(clientX) - Number(canvasRect.left) - stagePoint.x * nextZoom,
    offsetY: Number(clientY) - Number(canvasRect.top) - stagePoint.y * nextZoom,
    zoom: nextZoom,
  };
}

function normalizedCameraState(cameraState) {
  return {
    offsetX: Number(cameraState?.offsetX ?? 0),
    offsetY: Number(cameraState?.offsetY ?? 0),
    zoom: clampedCanvasZoom(cameraState?.zoom ?? 1),
  };
}
