import { NodeStatus } from "./node-status.js";
import { NodeId } from "./node-id.js";
import { NodeTitle } from "./node-title.js";
import { ParentId } from "./parent-id.js";
import { ProgressValue } from "./progress-value.js";

export class SkillNode {
  constructor(identity, parentReference) {
    this.identityValue = identity;
    this.parentReferenceValue = parentReference;
    this.state = {
      connectionControlOffset: { x: 0, y: 0 },
      layoutOffset: { x: 0, y: 0 },
      progress: ProgressValue.zero(),
      status: NodeStatus.inactive(),
      title: null,
    };
  }

  static create(identifier, title, parentReference) {
    const skillNode = new SkillNode(identifier, parentReference);

    skillNode.rename(title);

    return skillNode;
  }

  static fromSnapshot(snapshot, fallbackNodeId) {
    const skillNode = new SkillNode(
      NodeId.from(snapshot?.id ?? fallbackNodeId),
      ParentId.from(snapshot?.parentId ?? null),
    );

    skillNode.rename(NodeTitle.from(snapshot?.title));
    skillNode.syncProgress(ProgressValue.from(snapshot?.progress ?? 0));
    skillNode.state.status = NodeStatus.from(snapshot?.status);
    skillNode.setLayoutOffset(snapshot?.layoutOffsetX, snapshot?.layoutOffsetY);
    skillNode.setConnectionControlOffset(
      snapshot?.connectionControlOffsetX,
      snapshot?.connectionControlOffsetY,
    );

    return skillNode;
  }

  identity() {
    return this.identityValue;
  }

  isMastered() {
    return this.state.status.equals(NodeStatus.mastered());
  }

  isRoot() {
    return this.parentReferenceValue.isRoot();
  }

  markAsMastered() {
    this.state.progress = ProgressValue.complete();
    this.state.status = NodeStatus.mastered();
  }

  parentReference() {
    return this.parentReferenceValue;
  }

  refreshStatus(parentNode) {
    if (this.isAlreadyMastered()) {
      return;
    }

    if (this.state.progress.isComplete()) {
      this.state.status = NodeStatus.pending();
      return;
    }

    if (this.state.progress.hasStarted()) {
      this.state.status = NodeStatus.inProgress();
      return;
    }

    if (this.isUnlockedRoot()) {
      this.state.status = NodeStatus.pending();
      return;
    }

    if (this.parentAllowsProgress(parentNode)) {
      this.state.status = NodeStatus.pending();
      return;
    }

    this.state.status = NodeStatus.inactive();
  }

  rename(title) {
    this.state.title = title;
  }

  reparentTo(parentReference) {
    this.parentReferenceValue = parentReference;
  }

  resetForRetry(progressValue) {
    this.state.progress = progressValue;
    this.state.status = NodeStatus.inProgress();
  }

  resetProgress() {
    this.state.progress = ProgressValue.zero();
    this.state.status = NodeStatus.inactive();
  }

  sharesParentWith(otherNode) {
    return this.parentReference().equals(otherNode.parentReference());
  }

  setConnectionControlOffset(offsetX, offsetY) {
    this.state.connectionControlOffset = {
      x: Number(offsetX) || 0,
      y: Number(offsetY) || 0,
    };
  }

  setLayoutOffset(offsetX, offsetY) {
    this.state.layoutOffset = {
      x: Number(offsetX) || 0,
      y: Number(offsetY) || 0,
    };
  }

  syncProgress(progressValue) {
    this.state.progress = progressValue;
  }

  toSnapshot() {
    return {
      connectionControlOffsetX: this.state.connectionControlOffset.x,
      connectionControlOffsetY: this.state.connectionControlOffset.y,
      id: this.identityValue.toString(),
      layoutOffsetX: this.state.layoutOffset.x,
      layoutOffsetY: this.state.layoutOffset.y,
      parentId: this.parentReferenceValue.toNullableString(),
      progress: this.state.progress.toNumber(),
      status: this.state.status.toString(),
      title: this.state.title.toString(),
    };
  }

  updateProgress(progressAmount) {
    this.state.progress = this.state.progress.increaseBy(progressAmount);
  }

  isAlreadyMastered() {
    return this.state.status.equals(NodeStatus.mastered()) && this.state.progress.isComplete();
  }

  isUnlockedRoot() {
    return this.isRoot();
  }

  parentAllowsProgress(parentNode) {
    return parentNode !== null && (parentNode.isMastered() || parentNode.isRoot());
  }
}
