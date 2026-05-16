import test from "node:test";
import assert from "node:assert/strict";

import {
  canvasStagePoint,
  clampedCanvasZoom,
  fittedCanvasCameraState,
  pannedCanvasCameraState,
  scaledCanvasCameraState,
  zoomedCanvasCameraState,
} from "../../js/ui/canvas-camera.js";

test("canvasStagePoint converts viewport coordinates into stage point", () => {
  assert.deepEqual(
    canvasStagePoint(140, 120, { left: 20, top: 10 }, { offsetX: 40, offsetY: 30, zoom: 2 }),
    { x: 40, y: 40 },
  );
});

test("canvasStagePoint allows negative stage coordinates for infinite canvas navigation", () => {
  assert.deepEqual(
    canvasStagePoint(5, 6, { left: 10, top: 20 }, { offsetX: 0, offsetY: 0, zoom: 1 }),
    { x: -5, y: -14 },
  );
});

test("clampedCanvasZoom keeps zoom inside navigation bounds", () => {
  assert.equal(clampedCanvasZoom(0.01), 0.35);
  assert.equal(clampedCanvasZoom(8), 2.6);
});

test("pannedCanvasCameraState moves camera without changing zoom", () => {
  assert.deepEqual(
    pannedCanvasCameraState({ offsetX: 10, offsetY: 20, zoom: 1.5 }, 30, -5),
    { offsetX: 40, offsetY: 15, zoom: 1.5 },
  );
});

test("zoomedCanvasCameraState keeps pointer anchored on same stage point", () => {
  const canvasRect = { left: 10, top: 20 };
  const initialCamera = { offsetX: 0, offsetY: 0, zoom: 1 };
  const zoomedCamera = zoomedCanvasCameraState(initialCamera, -240, 210, 220, canvasRect);
  const initialStagePoint = canvasStagePoint(210, 220, canvasRect, initialCamera);
  const zoomedStagePoint = canvasStagePoint(210, 220, canvasRect, zoomedCamera);

  assert.equal(Number(zoomedStagePoint.x.toFixed(6)), Number(initialStagePoint.x.toFixed(6)));
  assert.equal(Number(zoomedStagePoint.y.toFixed(6)), Number(initialStagePoint.y.toFixed(6)));
});

test("fittedCanvasCameraState centers large tree content inside mobile viewport", () => {
  const fittedCamera = fittedCanvasCameraState(
    { height: 520, left: 300, top: 120, width: 700 },
    { height: 844, width: 390 },
    32,
  );
  const viewportLeft = 300 * fittedCamera.zoom + fittedCamera.offsetX;
  const viewportRight = (300 + 700) * fittedCamera.zoom + fittedCamera.offsetX;

  assert.ok(fittedCamera.zoom < 1);
  assert.equal(Number(viewportLeft.toFixed(2)), 32);
  assert.equal(Number(viewportRight.toFixed(2)), 358);
});

test("fittedCanvasCameraState avoids enlarging small trees", () => {
  const fittedCamera = fittedCanvasCameraState(
    { height: 200, left: 100, top: 80, width: 240 },
    { height: 900, width: 1200 },
    48,
  );

  assert.equal(fittedCamera.zoom, 1);
  assert.equal(fittedCamera.offsetX, 380);
  assert.equal(fittedCamera.offsetY, 270);
});

test("scaledCanvasCameraState zooms around viewport center", () => {
  const canvasRect = { height: 400, left: 10, top: 20, width: 600 };
  const initialCamera = { offsetX: 30, offsetY: 40, zoom: 1 };
  const nextCamera = scaledCanvasCameraState(initialCamera, 1.25, canvasRect);
  const viewportCenterX = canvasRect.left + canvasRect.width / 2;
  const viewportCenterY = canvasRect.top + canvasRect.height / 2;
  const initialStagePoint = canvasStagePoint(viewportCenterX, viewportCenterY, canvasRect, initialCamera);
  const nextStagePoint = canvasStagePoint(viewportCenterX, viewportCenterY, canvasRect, nextCamera);

  assert.equal(nextCamera.zoom, 1.25);
  assert.equal(Number(nextStagePoint.x.toFixed(6)), Number(initialStagePoint.x.toFixed(6)));
  assert.equal(Number(nextStagePoint.y.toFixed(6)), Number(initialStagePoint.y.toFixed(6)));
});
