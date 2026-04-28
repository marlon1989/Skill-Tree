import { NODE_STATUS } from "../state.js";

export function canAdvanceNode(node) {
  if (!node) {
    return false;
  }

  if (node.parentId === null) {
    return false;
  }

  if (node.status === NODE_STATUS.INACTIVE) {
    return false;
  }

  if (node.status === NODE_STATUS.MASTERED) {
    return false;
  }

  return Number(node.progress) < 100;
}

export function canOpenBossModal(node) {
  if (!node) {
    return false;
  }

  if (node.status === NODE_STATUS.MASTERED) {
    return false;
  }

  return Number(node.progress) >= 100;
}
