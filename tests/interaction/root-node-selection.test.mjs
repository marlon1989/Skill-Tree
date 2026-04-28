import test from "node:test";
import assert from "node:assert/strict";

import { firstCreatedRootNodeId } from "../../js/domain/root-node-selection.js";

test("firstCreatedRootNodeId returns empty string when tree has no roots", () => {
  assert.equal(firstCreatedRootNodeId({
    node_2: { id: "node_2", parentId: "node_1" },
  }), "");
});

test("firstCreatedRootNodeId picks lowest created root still present", () => {
  assert.equal(firstCreatedRootNodeId({
    node_9: { id: "node_9", parentId: null },
    node_4: { id: "node_4", parentId: null },
    node_2: { id: "node_2", parentId: "node_1" },
    node_7: { id: "node_7", parentId: null },
  }), "node_4");
});

test("firstCreatedRootNodeId ignores malformed ids while valid roots exist", () => {
  assert.equal(firstCreatedRootNodeId({
    custom_root: { id: "custom_root", parentId: null },
    node_12: { id: "node_12", parentId: null },
    node_3: { id: "node_3", parentId: null },
  }), "node_3");
});
