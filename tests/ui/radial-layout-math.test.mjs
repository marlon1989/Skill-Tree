import test from "node:test";
import assert from "node:assert/strict";

import {
  childSector,
  createRootSectors,
  pointOnOrbit,
} from "../../js/ui/radial-layout-math.js";

test("createRootSectors spreads roots across circle", () => {
  const sectors = createRootSectors(4);

  assert.equal(sectors.length, 4);
  assert.deepEqual(
    sectors.map((sector) => sector.centerAngle),
    [-90, 0, 90, 180],
  );
});

test("createRootSectors gives single root wide fan", () => {
  const [singleSector] = createRootSectors(1);

  assert.equal(singleSector.centerAngle, -90);
  assert.equal(singleSector.span, 240);
});

test("childSector keeps single descendant on parent axis", () => {
  const parentSector = { centerAngle: 25, endAngle: 65, span: 80, startAngle: -15 };
  const singleChildSector = childSector(parentSector, 1, 0);

  assert.equal(singleChildSector.centerAngle, 25);
  assert.equal(singleChildSector.span, 12);
});

test("childSector splits siblings inside parent sector", () => {
  const parentSector = { centerAngle: 0, endAngle: 45, span: 90, startAngle: -45 };
  const leftChild = childSector(parentSector, 3, 0);
  const middleChild = childSector(parentSector, 3, 1);
  const rightChild = childSector(parentSector, 3, 2);

  assert.equal(leftChild.centerAngle, -30);
  assert.equal(middleChild.centerAngle, 0);
  assert.equal(rightChild.centerAngle, 30);
  assert.ok(leftChild.startAngle >= parentSector.startAngle);
  assert.ok(rightChild.endAngle <= parentSector.endAngle);
});

test("pointOnOrbit converts polar positions into x and y", () => {
  const topPoint = pointOnOrbit({ x: 100, y: 100 }, 50, -90);
  const rightPoint = pointOnOrbit({ x: 100, y: 100 }, 50, 0);

  assert.equal(Math.round(topPoint.x), 100);
  assert.equal(Math.round(topPoint.y), 50);
  assert.equal(Math.round(rightPoint.x), 150);
  assert.equal(Math.round(rightPoint.y), 100);
});
