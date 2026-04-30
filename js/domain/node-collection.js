import { SkillNode } from "./skill-node.js";

export class NodeCollection {
  constructor(entries) {
    this.entries = entries;
  }

  static empty() {
    return new NodeCollection(new Map());
  }

  static fromSnapshot(snapshot) {
    const entries = new Map();

    Object.entries(snapshot ?? {}).forEach(([nodeId, nodeSnapshot]) => {
      const node = SkillNode.fromSnapshot(nodeSnapshot, nodeId);

      entries.set(node.identity().toString(), node);
    });

    return new NodeCollection(entries);
  }

  add(node) {
    this.entries.set(node.identity().toString(), node);
  }

  each(callback) {
    this.entries.forEach(callback);
  }

  remove(nodeId) {
    this.entries.delete(nodeId.toString());
  }

  require(nodeId) {
    const node = this.entries.get(nodeId.toString());

    if (!node) {
      throw new Error(`Node "${nodeId.toString()}" não existe.`);
    }

    return node;
  }

  toSnapshot() {
    const snapshot = {};

    this.entries.forEach((node, nodeKey) => {
      snapshot[nodeKey] = node.toSnapshot();
    });

    return snapshot;
  }
}
