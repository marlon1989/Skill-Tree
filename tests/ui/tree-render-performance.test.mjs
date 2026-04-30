import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

globalThis.window = {
  innerHeight: 900,
  innerWidth: 1440,
};

const { ROOT_PARENT_KEY, NODE_STATUS } = await import("../../js/domain/constants.js");
const { LayoutTokens } = await import("../../js/ui/layout-tokens.js");
const { RenderedTree, TreeLayoutEngine } = await import("../../js/ui/tree-layout.js");
const { TreeSnapshot } = await import("../../js/ui/tree-snapshot.js");

const LARGE_TREE_ROOT_COUNT = 5;
const LARGE_TREE_CHAIN_LENGTH = 100;
const RENDER_SMOKE_BUDGET_MS = 3_000;

test("large tree layout stays within the smoke performance budget", () => {
  const treeSnapshot = TreeSnapshot.from(largeTreeSnapshot());
  const startedAt = performance.now();
  const layoutEngine = new TreeLayoutEngine(treeSnapshot, LayoutTokens.default());
  const renderedTree = RenderedTree.from(treeSnapshot, layoutEngine);
  const renderedMarkup = renderedTree.connectionMarkup() + renderedTree.nodeMarkup();
  const durationMs = performance.now() - startedAt;

  assert.equal(renderedTree.nodeCount(), 500);
  assert.match(renderedMarkup, /data-node-id="node_500"/);
  assert.ok(
    durationMs < RENDER_SMOKE_BUDGET_MS,
    `Large tree render took ${durationMs.toFixed(2)}ms; expected < ${RENDER_SMOKE_BUDGET_MS}ms.`,
  );
});

function largeTreeSnapshot() {
  const childIdsByParent = { [ROOT_PARENT_KEY]: [] };
  const nodesById = {};

  Array.from({ length: LARGE_TREE_ROOT_COUNT }, (_, rootIndex) => {
    appendRootChain(childIdsByParent, nodesById, rootIndex);
  });

  return {
    childIdsByParent,
    masteryHubs: [],
    nextId: 501,
    nodesById,
  };
}

function appendRootChain(childIdsByParent, nodesById, rootIndex) {
  const rootNodeId = nodeIdFor(rootIndex, 0);

  childIdsByParent[ROOT_PARENT_KEY].push(rootNodeId);
  childIdsByParent[rootNodeId] = [];
  nodesById[rootNodeId] = nodeSnapshot(rootNodeId, null, "origin");

  Array.from({ length: LARGE_TREE_CHAIN_LENGTH - 1 }, (_, childIndex) => {
    const depthIndex = childIndex + 1;
    const nodeId = nodeIdFor(rootIndex, depthIndex);
    const parentId = nodeIdFor(rootIndex, depthIndex - 1);

    childIdsByParent[parentId].push(nodeId);
    childIdsByParent[nodeId] = [];
    nodesById[nodeId] = nodeSnapshot(nodeId, parentId, "subtopic");
  });
}

function nodeIdFor(rootIndex, depthIndex) {
  return `node_${rootIndex * LARGE_TREE_CHAIN_LENGTH + depthIndex + 1}`;
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
