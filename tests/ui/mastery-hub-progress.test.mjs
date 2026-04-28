import test from "node:test";
import assert from "node:assert/strict";

import { masteryHubCompletionPercentage } from "../../js/ui/mastery-hub-progress.js";

test("masteryHubCompletionPercentage returns zero for empty subtree", () => {
  assert.equal(
    masteryHubCompletionPercentage({ masteredNodeCount: 0, nodeCount: 0 }),
    0,
  );
});

test("masteryHubCompletionPercentage converts subtree mastery ratio into percent", () => {
  assert.equal(
    masteryHubCompletionPercentage({ masteredNodeCount: 1, nodeCount: 4 }),
    25,
  );
});

test("masteryHubCompletionPercentage clamps overflow metrics", () => {
  assert.equal(
    masteryHubCompletionPercentage({ masteredNodeCount: 9, nodeCount: 3 }),
    100,
  );
});
