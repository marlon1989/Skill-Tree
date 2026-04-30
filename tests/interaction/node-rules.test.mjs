import test from "node:test";
import assert from "node:assert/strict";

import { canAdvanceNode } from "../../js/interaction/node-rules.js";

test("canAdvanceNode blocks top-level origin nodes", () => {
  assert.equal(canAdvanceNode({
    nodeKind: "origin",
    parentId: null,
    progress: 0,
    status: "pendente",
  }), false);
});

test("canAdvanceNode blocks origin nodes nested under subtópicos", () => {
  assert.equal(canAdvanceNode({
    nodeKind: "origin",
    parentId: "node_2",
    progress: 0,
    status: "pendente",
  }), false);
});

test("canAdvanceNode allows active subtópicos below complete progress", () => {
  assert.equal(canAdvanceNode({
    nodeKind: "subtopic",
    parentId: "node_1",
    progress: 40,
    status: "pendente",
  }), true);
});
