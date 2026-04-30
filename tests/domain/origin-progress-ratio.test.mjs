import test from "node:test";
import assert from "node:assert/strict";

import { masteredDescendantProgressPercent } from "../../js/domain/origin-progress-ratio.js";

const ratioCases = Object.freeze([
  { expectedPercent: 0, masteredIds: [], nodeIds: [] },
  ratioCaseFor(5, 0),
  ratioCaseFor(5, 1),
  ratioCaseFor(5, 2),
  ratioCaseFor(5, 5),
  ratioCaseFor(10, 1),
  ratioCaseFor(20, 7),
  ratioCaseFor(100, 100),
]);

ratioCases.forEach(({ expectedPercent, masteredIds, nodeIds }) => {
  test(`masteredDescendantProgressPercent returns ${expectedPercent} for ${masteredIds.length}/${nodeIds.length}`, () => {
    const masteredIdSet = new Set(masteredIds);

    assert.equal(
      masteredDescendantProgressPercent(nodeIds, (nodeId) => masteredIdSet.has(nodeId)),
      expectedPercent,
    );
  });
});

test("masteredDescendantProgressPercent counts nested origin as complete only when its subtópicos complete", () => {
  assert.equal(masteredDescendantProgressPercent({
    childIdsOf: (parentNodeId) => ({
      node_1: ["node_2", "node_3"],
      node_2: [],
      node_3: ["node_4", "node_5"],
      node_4: [],
      node_5: [],
    })[parentNodeId] ?? [],
    isMasteredNodeId: (nodeId) => ["node_2", "node_4", "node_5"].includes(nodeId),
    isOriginNodeId: (nodeId) => nodeId === "node_3",
    rootNodeId: "node_1",
  }), 100);
});

test("masteredDescendantProgressPercent leaves nested origin empty while any subtópico remains open", () => {
  assert.equal(masteredDescendantProgressPercent({
    childIdsOf: (parentNodeId) => ({
      node_1: ["node_2", "node_3"],
      node_2: [],
      node_3: ["node_4", "node_5"],
      node_4: [],
      node_5: [],
    })[parentNodeId] ?? [],
    isMasteredNodeId: (nodeId) => ["node_2", "node_4"].includes(nodeId),
    isOriginNodeId: (nodeId) => nodeId === "node_3",
    rootNodeId: "node_1",
  }), 50);
});

function expectedPercentOf(masteredCount, descendantCount) {
  if (descendantCount === 0) {
    return 0;
  }

  return Number(((masteredCount / descendantCount) * 100).toFixed(2));
}

function nodeIdsFor(descendantCount) {
  return Array.from({ length: descendantCount }, (_, index) => `node_${index + 1}`);
}

function ratioCaseFor(descendantCount, masteredCount) {
  const nodeIds = nodeIdsFor(descendantCount);

  return {
    expectedPercent: expectedPercentOf(masteredCount, descendantCount),
    masteredIds: nodeIds.slice(0, masteredCount),
    nodeIds,
  };
}
