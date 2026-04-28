import test from "node:test";
import assert from "node:assert/strict";

import { contextOriginParentId } from "../../js/interaction/context-origin-parent-id.js";

test("contextOriginParentId keeps canvas root creation at top level", () => {
  assert.equal(contextOriginParentId({}, ""), null);
});

test("contextOriginParentId keeps empty-canvas root creation when selected node is top-level root", () => {
  assert.equal(contextOriginParentId({
    node_1: { id: "node_1", parentId: null },
  }, "node_1"), null);
});

test("contextOriginParentId turns subtopic origin creation into child of selected subtopic", () => {
  assert.equal(contextOriginParentId({
    node_1: { id: "node_1", parentId: null },
    node_2: { id: "node_2", parentId: "node_1" },
  }, "node_2"), "node_2");
});
