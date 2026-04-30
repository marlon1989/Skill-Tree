import test from "node:test";
import assert from "node:assert/strict";

import { NODE_STATUS, ROOT_PARENT_KEY } from "../../js/domain/constants.js";
import { SkillTreeStore } from "../../js/domain/skill-tree-store.js";

test("syncRootProgress counts all descendants instead of only direct children", () => {
  const store = SkillTreeStore.fromSnapshot(chainSnapshotWithMasteredCount(5, 1));

  assert.equal(store.syncRootProgress("node_1").progress, 20);
});

[
  { descendantCount: 5, masteredCount: 0 },
  { descendantCount: 5, masteredCount: 1 },
  { descendantCount: 5, masteredCount: 2 },
  { descendantCount: 5, masteredCount: 5 },
  { descendantCount: 10, masteredCount: 1 },
  { descendantCount: 20, masteredCount: 7 },
  { descendantCount: 100, masteredCount: 100 },
].forEach(({ descendantCount, masteredCount }) => {
  const expectedProgress = expectedPercentOf(masteredCount, descendantCount);

  test(`syncRootProgress returns ${expectedProgress} for ${masteredCount}/${descendantCount} mastered chain descendants`, () => {
    const store = SkillTreeStore.fromSnapshot(chainSnapshotWithMasteredCount(descendantCount, masteredCount));

    assert.equal(store.syncRootProgress("node_1").progress, expectedProgress);
  });
});

test("syncRootProgress handles branched descendants", () => {
  const store = SkillTreeStore.fromSnapshot({
    childIdsByParent: {
      [ROOT_PARENT_KEY]: ["node_1"],
      node_1: ["node_2", "node_3"],
      node_2: ["node_4", "node_5"],
      node_3: ["node_6"],
      node_4: [],
      node_5: [],
      node_6: [],
    },
    nextId: 7,
    nodesById: {
      node_1: rootNodeSnapshot("node_1", "Geometria", 0, NODE_STATUS.IN_PROGRESS),
      node_2: masteredNodeSnapshot("node_2", "Triângulos", "node_1"),
      node_3: childNodeSnapshot("node_3", "Círculos", "node_1", 0, NODE_STATUS.INACTIVE),
      node_4: masteredNodeSnapshot("node_4", "Ângulos", "node_2"),
      node_5: masteredNodeSnapshot("node_5", "Área", "node_2"),
      node_6: childNodeSnapshot("node_6", "Raio", "node_3", 0, NODE_STATUS.INACTIVE),
    },
  });

  assert.equal(store.syncRootProgress("node_1").progress, 60);
});

test("syncRootProgress treats nested origin as complete only after its subtópicos complete", () => {
  const store = SkillTreeStore.fromSnapshot({
    childIdsByParent: {
      [ROOT_PARENT_KEY]: ["node_1"],
      node_1: ["node_2", "node_3"],
      node_2: [],
      node_3: ["node_4", "node_5"],
      node_4: [],
      node_5: [],
    },
    nextId: 6,
    nodesById: {
      node_1: rootNodeSnapshot("node_1", "Matemática", 0, NODE_STATUS.IN_PROGRESS),
      node_2: masteredNodeSnapshot("node_2", "Soma", "node_1"),
      node_3: originNodeSnapshot("node_3", "Álgebra", "node_1", 0, NODE_STATUS.IN_PROGRESS),
      node_4: masteredNodeSnapshot("node_4", "Equações", "node_3"),
      node_5: childNodeSnapshot("node_5", "Funções", "node_3", 0, NODE_STATUS.INACTIVE),
    },
  });

  assert.equal(store.syncRootProgress("node_1").progress, 50);
});

test("resetRootProgress resets nested origin and subtópicos but preserves origin child branch", () => {
  const store = SkillTreeStore.fromSnapshot({
    childIdsByParent: {
      [ROOT_PARENT_KEY]: ["node_1"],
      node_1: ["node_2"],
      node_2: ["node_3", "node_4"],
      node_3: ["node_5"],
      node_4: ["node_6"],
      node_5: [],
      node_6: [],
    },
    nextId: 7,
    nodesById: {
      node_1: rootNodeSnapshot("node_1", "Matemática", 100, NODE_STATUS.MASTERED),
      node_2: originNodeSnapshot("node_2", "Álgebra", "node_1", 100, NODE_STATUS.MASTERED),
      node_3: masteredNodeSnapshot("node_3", "Equações", "node_2"),
      node_4: originNodeSnapshot("node_4", "Funções", "node_2", 100, NODE_STATUS.MASTERED),
      node_5: masteredNodeSnapshot("node_5", "Lineares", "node_3"),
      node_6: masteredNodeSnapshot("node_6", "Quadráticas", "node_4"),
    },
  });

  store.resetRootProgress("node_2");

  assert.equal(store.getNode("node_2").progress, 0);
  assert.equal(store.getNode("node_3").progress, 0);
  assert.equal(store.getNode("node_5").progress, 0);
  assert.equal(store.getNode("node_4").progress, 100);
  assert.equal(store.getNode("node_6").progress, 100);
});

function childNodeSnapshot(id, title, parentId, progress, status) {
  return {
    ...layoutSnapshot(id, title, progress, status),
    parentId,
  };
}

function originNodeSnapshot(id, title, parentId, progress, status) {
  return {
    ...childNodeSnapshot(id, title, parentId, progress, status),
    nodeKind: "origin",
  };
}

function chainSnapshotWithMasteredCount(descendantCount, masteredCount) {
  const childHierarchy = {
    [ROOT_PARENT_KEY]: ["node_1"],
  };
  const nodesById = {
    node_1: rootNodeSnapshot("node_1", "Geometria", 0, NODE_STATUS.IN_PROGRESS),
  };

  Array.from({ length: descendantCount }, (_, index) => {
    const nodeNumber = index + 2;
    const nodeId = `node_${nodeNumber}`;
    const parentId = `node_${nodeNumber - 1}`;
    const childId = index === descendantCount - 1 ? null : `node_${nodeNumber + 1}`;

    childHierarchy[parentId] = [nodeId];
    childHierarchy[nodeId] = childId ? [childId] : [];
    nodesById[nodeId] = chainedNodeSnapshot(
      nodeId,
      `Subtópico ${index + 1}`,
      parentId,
      masteredCount,
      index + 1,
    );

    return nodeId;
  });

  return {
    childIdsByParent: childHierarchy,
    nextId: descendantCount + 2,
    nodesById,
  };
}

function chainedNodeSnapshot(id, title, parentId, masteredCount, chainIndex) {
  if (chainIndex <= masteredCount) {
    return masteredNodeSnapshot(id, title, parentId);
  }

  return childNodeSnapshot(id, title, parentId, 0, NODE_STATUS.INACTIVE);
}

function masteredNodeSnapshot(id, title, parentId) {
  return childNodeSnapshot(id, title, parentId, 100, NODE_STATUS.MASTERED);
}

function rootNodeSnapshot(id, title, progress, status) {
  return {
    ...layoutSnapshot(id, title, progress, status),
    parentId: null,
  };
}

function layoutSnapshot(id, title, progress, status) {
  return {
    connectionControlOffsetX: 0,
    connectionControlOffsetY: 0,
    id,
    layoutOffsetX: 0,
    layoutOffsetY: 0,
    progress,
    status,
    title,
  };
}

function expectedPercentOf(masteredCount, descendantCount) {
  if (descendantCount === 0) {
    return 0;
  }

  return Number(((masteredCount / descendantCount) * 100).toFixed(2));
}
