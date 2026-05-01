import assert from "node:assert/strict";
import test from "node:test";

const {
  edgePointToward,
  masteryHubControlPoint,
  midpointControlPoint,
  quadraticSvgPath,
} = await import("../../js/ui/svg-path-geometry.js");

test("quadraticSvgPath formats compact SVG curve coordinates", () => {
  const pathValue = quadraticSvgPath({ x: 0, y: 10 }, { x: 5.1254, y: 7 }, { x: 10, y: 0 });

  assert.equal(pathValue, "M 0 10 Q 5.125 7, 10 0");
});

test("edgePointToward returns source edge facing target", () => {
  const edgePoint = edgePointToward({ x: 10, y: 10 }, { x: 20, y: 10 }, 8);

  assert.deepEqual(edgePoint, { x: 14, y: 10 });
});

test("midpointControlPoint includes connection offset", () => {
  const controlPoint = midpointControlPoint({ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 2, y: -3 });

  assert.deepEqual(controlPoint, { x: 7, y: 7 });
});

test("masteryHubControlPoint arches above nearest endpoint", () => {
  const controlPoint = masteryHubControlPoint({ x: 10, y: 80 }, { x: 30, y: 20 });

  assert.deepEqual(controlPoint, { x: 20, y: -16 });
});
