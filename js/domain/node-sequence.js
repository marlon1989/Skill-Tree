import { NodeId } from "./node-id.js";

export class NodeSequence {
  constructor(nextValue) {
    this.nextValue = nextValue;
  }

  static fromSnapshot(rawValue, existingNodeIds = []) {
    const normalizedValue = Number(rawValue);
    const derivedNextValue = highestNodeIndexOf(existingNodeIds) + 1;

    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      return new NodeSequence(derivedNextValue);
    }

    return new NodeSequence(Math.max(Math.trunc(normalizedValue), derivedNextValue));
  }

  createNodeId() {
    const nodeId = new NodeId(`node_${this.nextValue}`);

    this.nextValue += 1;

    return nodeId;
  }

  currentValue() {
    return this.nextValue;
  }
}

function highestNodeIndexOf(nodeIds) {
  return nodeIds.reduce((highestValue, nodeId) => {
    const matchedValue = String(nodeId).match(/node_(\d+)$/);

    if (!matchedValue) {
      return highestValue;
    }

    return Math.max(highestValue, Number(matchedValue[1]));
  }, 0);
}
