import test from "node:test";
import assert from "node:assert/strict";

import { NodeVisualState } from "../../js/ui/node-visual-state.js";

class FakeNodeProgress {
  constructor(progressValue) {
    this.progressValue = progressValue;
  }

  isComplete() {
    return this.progressValue >= 100;
  }

  isStarted() {
    return this.progressValue > 0;
  }

  ringAngle() {
    return this.progressValue * 3.6;
  }
}

class FakeNodeStatus {
  constructor(masteredValue) {
    this.masteredValue = masteredValue;
  }

  isMastered() {
    return this.masteredValue;
  }
}

class FakeVisualTreeNode {
  constructor(progressValue, masteredValue) {
    this.progressValue = progressValue;
    this.masteredValue = masteredValue;
  }

  orderIndexLabel() {
    return "1";
  }

  progress() {
    return new FakeNodeProgress(this.progressValue);
  }

  status() {
    return new FakeNodeStatus(this.masteredValue);
  }
}

test("NodeVisualState keeps in-progress node core gray but progress ring colored", () => {
  const visualState = NodeVisualState.resolve(new FakeVisualTreeNode(45, false));

  assert.equal(visualState.key().toString(), "in-progress");
  assert.match(visualState.coreStyle(), /rgba\(31,41,55,0\.96\)/);
  assert.match(visualState.ringMarkup(new FakeNodeProgress(45)), /--branch-accent-strong/);
});

test("NodeVisualState keeps pending node core gray but mastery alert colored", () => {
  const visualState = NodeVisualState.resolve(new FakeVisualTreeNode(100, false));

  assert.equal(visualState.key().toString(), "pending-mastery");
  assert.match(visualState.coreStyle(), /rgba\(31,41,55,0\.96\)/);
  assert.match(visualState.ringMarkup(new FakeNodeProgress(100)), /rgba\(255,216,151,0\.82\)/);
});

test("NodeVisualState restores branch color when node is mastered", () => {
  const visualState = NodeVisualState.resolve(new FakeVisualTreeNode(100, true));

  assert.equal(visualState.key().toString(), "mastered");
  assert.match(visualState.coreStyle(), /--branch-accent-strong/);
  assert.match(visualState.ringMarkup(new FakeNodeProgress(100)), /--branch-glow-strong/);
});
