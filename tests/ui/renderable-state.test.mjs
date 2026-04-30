import test from "node:test";
import assert from "node:assert/strict";

const { NODE_STATUS, ROOT_PARENT_KEY } = await import("../../js/domain/constants.js");
const { createRenderableState } = await import("../../js/render.js");

test("createRenderableState derives decay multipliers without the global store", () => {
  const renderableState = createRenderableState(externalTreeSnapshot());

  assert.equal(renderableState.nodesById.external_1.decayMultiplier, 10);
  assert.equal(renderableState.nodesById.external_2.decayMultiplier, 6.5);
  assert.equal(renderableState.nodesById.external_3.decayMultiplier, 3);
});

function externalTreeSnapshot() {
  return {
    childIdsByParent: {
      [ROOT_PARENT_KEY]: ["external_1"],
      external_1: ["external_2"],
      external_2: ["external_3"],
      external_3: [],
    },
    masteryHubs: [],
    nextId: 4,
    nodesById: {
      external_1: nodeSnapshot("external_1", null, "origin"),
      external_2: nodeSnapshot("external_2", "external_1", "subtopic"),
      external_3: nodeSnapshot("external_3", "external_2", "subtopic"),
    },
  };
}

function nodeSnapshot(nodeId, parentId, nodeKind) {
  return {
    connectionControlOffsetX: 0,
    connectionControlOffsetY: 0,
    id: nodeId,
    layoutOffsetX: 0,
    layoutOffsetY: 0,
    nodeKind,
    parentId,
    progress: 0,
    sourceMasteryHubId: "",
    status: NODE_STATUS.INACTIVE,
    title: `Topic ${nodeId}`,
  };
}
