import { ROOT_PARENT_KEY } from "./constants.js";
import { NodeId } from "./node-id.js";

export class ParentId {
  constructor(linkedNodeId) {
    this.linkedNodeId = linkedNodeId;
  }

  static from(rawValue) {
    if (rawValue === null) {
      return ParentId.root();
    }

    return new ParentId(NodeId.from(rawValue));
  }

  static root() {
    return new ParentId(null);
  }

  equals(otherParentId) {
    const currentLinkedNodeId = this.toNodeId();
    const otherLinkedNodeId = otherParentId.toNodeId();

    if (currentLinkedNodeId === null) {
      return otherLinkedNodeId === null;
    }

    if (otherLinkedNodeId === null) {
      return false;
    }

    return currentLinkedNodeId.equals(otherLinkedNodeId);
  }

  isRoot() {
    return this.linkedNodeId === null;
  }

  toBucketKey() {
    if (this.isRoot()) {
      return ROOT_PARENT_KEY;
    }

    return this.linkedNodeId.toString();
  }

  toNodeId() {
    return this.linkedNodeId;
  }

  toNullableString() {
    if (this.isRoot()) {
      return null;
    }

    return this.linkedNodeId.toString();
  }
}
