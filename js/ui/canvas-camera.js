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

/**
 * Fit rendered tree bounds into the current viewport without upscaling small trees.
 * Example:
 *   fittedCanvasCameraState({ left: 0, top: 0, width: 800, height: 400 }, { width: 400, height: 300 }, 32).zoom < 1
 */
export function fittedCanvasCameraState(contentBounds, viewportSize, viewportPadding = 40) {
  const normalizedBounds = normalizedContentBounds(contentBounds);
  const normalizedViewport = normalizedViewportSize(viewportSize);
  const safePadding = Math.max(0, Number(viewportPadding) || 0);
  const availableWidth = Math.max(1, normalizedViewport.width - safePadding * 2);
  const availableHeight = Math.max(1, normalizedViewport.height - safePadding * 2);
  const nextZoom = Math.min(
    1,
    clampedCanvasZoom(availableWidth / normalizedBounds.width),
    clampedCanvasZoom(availableHeight / normalizedBounds.height),
  );

  return centeredCameraState(normalizedBounds, normalizedViewport, nextZoom);
}

export function pannedCanvasCameraState(cameraState, deltaX, deltaY) {
  const normalizedCamera = normalizedCameraState(cameraState);

  return {
    offsetX: normalizedCamera.offsetX + Number(deltaX),
    offsetY: normalizedCamera.offsetY + Number(deltaY),
    zoom: normalizedCamera.zoom,
  };
}

export function scaledCanvasCameraState(cameraState, zoomFactor, canvasRect) {
  const normalizedCamera = normalizedCameraState(cameraState);
  const normalizedCanvas = normalizedCanvasRect(canvasRect);
  const centerX = normalizedCanvas.left + normalizedCanvas.width / 2;
  const centerY = normalizedCanvas.top + normalizedCanvas.height / 2;
  const stagePoint = canvasStagePoint(centerX, centerY, normalizedCanvas, normalizedCamera);
  const nextZoom = clampedCanvasZoom(normalizedCamera.zoom * (Number(zoomFactor) || 1));

  return {
    offsetX: normalizedCanvas.width / 2 - stagePoint.x * nextZoom,
    offsetY: normalizedCanvas.height / 2 - stagePoint.y * nextZoom,
    zoom: nextZoom,
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

function centeredCameraState(contentBounds, viewportSize, zoomValue) {
  return {
    offsetX: (viewportSize.width - contentBounds.width * zoomValue) / 2 -
      contentBounds.left * zoomValue,
    offsetY: (viewportSize.height - contentBounds.height * zoomValue) / 2 -
      contentBounds.top * zoomValue,
    zoom: zoomValue,
  };
}

function normalizedCanvasRect(canvasRect) {
  return {
    height: Math.max(1, Number(canvasRect?.height ?? 1)),
    left: Number(canvasRect?.left ?? 0),
    top: Number(canvasRect?.top ?? 0),
    width: Math.max(1, Number(canvasRect?.width ?? 1)),
  };
}

function normalizedCameraState(cameraState) {
  return {
    offsetX: Number(cameraState?.offsetX ?? 0),
    offsetY: Number(cameraState?.offsetY ?? 0),
    zoom: clampedCanvasZoom(cameraState?.zoom ?? 1),
  };
}

function normalizedContentBounds(contentBounds) {
  return {
    height: Math.max(1, Number(contentBounds?.height ?? 1)),
    left: Number(contentBounds?.left ?? 0),
    top: Number(contentBounds?.top ?? 0),
    width: Math.max(1, Number(contentBounds?.width ?? 1)),
  };
}

function normalizedViewportSize(viewportSize) {
  return {
    height: Math.max(1, Number(viewportSize?.height ?? 1)),
    width: Math.max(1, Number(viewportSize?.width ?? 1)),
  };
}
