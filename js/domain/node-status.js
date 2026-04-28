import { NODE_STATUS } from "./constants.js";

export class NodeStatus {
  constructor(value) {
    this.value = value;
  }

  static from(rawValue) {
    switch (rawValue) {
      case NODE_STATUS.INACTIVE:
        return NodeStatus.inactive();
      case NODE_STATUS.IN_PROGRESS:
        return NodeStatus.inProgress();
      case NODE_STATUS.PENDING:
        return NodeStatus.pending();
      case NODE_STATUS.MASTERED:
        return NodeStatus.mastered();
      default:
        throw new Error(`Status de nó inválido: "${rawValue}".`);
    }
  }

  static inactive() {
    return new NodeStatus(NODE_STATUS.INACTIVE);
  }

  static inProgress() {
    return new NodeStatus(NODE_STATUS.IN_PROGRESS);
  }

  static mastered() {
    return new NodeStatus(NODE_STATUS.MASTERED);
  }

  static pending() {
    return new NodeStatus(NODE_STATUS.PENDING);
  }

  equals(otherStatus) {
    return this.value === otherStatus.value;
  }

  toString() {
    return this.value;
  }
}
