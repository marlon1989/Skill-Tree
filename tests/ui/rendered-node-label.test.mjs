import test from "node:test";
import assert from "node:assert/strict";

import { NODE_STATUS } from "../../js/domain/constants.js";
import { BranchTheme } from "../../js/ui/branch-theme.js";
import { LayoutTokens } from "../../js/ui/layout-tokens.js";
import { RenderedNode } from "../../js/ui/rendered-node.js";

class FakeMarkupText {
  constructor(value) {
    this.value = value;
  }

  toMarkup() {
    return this.value;
  }

  toString() {
    return this.value;
  }
}

class FakeRenderedNodeIdentifier {
  constructor(value) {
    this.value = value;
  }

  optionalMarkup() {
    return this.value;
  }

  toMarkup() {
    return this.value;
  }

  toString() {
    return this.value;
  }
}

class FakeRenderedNodeStatus {
  isMastered() {
    return false;
  }

  raw() {
    return new FakeMarkupText(NODE_STATUS.INACTIVE);
  }
}

class FakeRenderedNodeProgress {
  isComplete() {
    return false;
  }

  isStarted() {
    return false;
  }

  raw() {
    return 0;
  }

  ringAngle() {
    return 0;
  }
}

class FakeRenderedTreeNode {
  decayMultiplierLabel() {
    return "10";
  }

  id() {
    return new FakeRenderedNodeIdentifier("node_2");
  }

  isOrigin() {
    return false;
  }

  orderIndexLabel() {
    return "2";
  }

  parentId() {
    return new FakeRenderedNodeIdentifier("node_1");
  }

  progress() {
    return new FakeRenderedNodeProgress();
  }

  sourceMasteryHubId() {
    return "";
  }

  status() {
    return new FakeRenderedNodeStatus();
  }

  title() {
    return new FakeMarkupText("Soma");
  }
}

class FakeNodePosition {
  left() {
    return 120;
  }

  size() {
    return 68;
  }

  top() {
    return 240;
  }
}

test("RenderedNode exposes persistent title caption and keyboard focus target", () => {
  const markup = new RenderedNode(
    new FakeRenderedTreeNode(),
    new FakeNodePosition(),
    LayoutTokens.default(),
    BranchTheme.fromPalette(0),
  ).toMarkup();

  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /data-node-title-caption="true"/);
  assert.match(markup, />\s*Soma\s*</);
  assert.match(markup, /class="tree-node-card /);
});
