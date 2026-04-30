import { ChildHierarchy } from "./child-hierarchy.js";
import {
  MAXIMUM_DECAY_MULTIPLIER,
  MINIMUM_DECAY_MULTIPLIER,
} from "./constants.js";
import { NodeCollection } from "./node-collection.js";
import { NodeId } from "./node-id.js";
import { NodeSequence } from "./node-sequence.js";
import { NodeTitle } from "./node-title.js";
import { masteredDescendantProgressPercent } from "./origin-progress-ratio.js";
import { ParentId } from "./parent-id.js";
import { ProgressAmount } from "./progress-amount.js";
import { ProgressValue } from "./progress-value.js";
import { SkillNode } from "./skill-node.js";

export class SkillTreeStore {
  constructor(context) {
    this.context = context;
  }

  static scaffold() {
    const store = new SkillTreeStore({
      hierarchy: ChildHierarchy.empty(),
      nodeSequence: new NodeSequence(4),
      nodes: NodeCollection.empty(),
    });

    store.seedInitialTree();
    store.recalculateStatuses();

    return store;
  }

  static fromSnapshot(snapshot) {
    const nodeIds = Object.keys(snapshot?.nodesById ?? {});

    return new SkillTreeStore({
      hierarchy: ChildHierarchy.fromSnapshot(snapshot?.childIdsByParent, nodeIds),
      nodeSequence: NodeSequence.fromSnapshot(snapshot?.nextId, nodeIds),
      nodes: NodeCollection.fromSnapshot(snapshot?.nodesById),
    });
  }

  addNode(parentId, title, nodeKind = "subtopic", sourceMasteryHubId = "") {
    const parentReference = ParentId.from(parentId);

    this.requireParent(parentReference);

    const nodeId = this.context.nodeSequence.createNodeId();
    const newNode = SkillNode.create(
      nodeId,
      NodeTitle.from(title),
      parentReference,
      nodeKind,
      sourceMasteryHubId,
    );

    this.context.nodes.add(newNode);
    this.context.hierarchy.append(parentReference, nodeId);
    this.context.hierarchy.ensureBucket(ParentId.from(nodeId.toString()));
    this.syncAllRootProgresses();
    this.recalculateStatuses();

    return newNode.toSnapshot();
  }

  deleteNode(nodeId) {
    const targetNodeId = NodeId.from(nodeId);
    const targetNode = this.context.nodes.require(targetNodeId);
    const childReference = ParentId.from(targetNodeId.toString());
    const childIds = this.context.hierarchy.childrenOf(childReference);
    const parentReference = targetNode.parentReference();

    this.context.hierarchy.replaceNodeWithChildren(targetNode, childIds);
    this.reparentChildren(childIds, parentReference);
    this.context.nodes.remove(targetNodeId);
    this.context.hierarchy.removeBucket(childReference);
    this.syncAllRootProgresses();
    this.recalculateStatuses();

    return {
      deletedNodeId: targetNodeId.toString(),
      reparentedChildIds: childIds.map((childId) => childId.toString()),
    };
  }

  getLinearDecayMultiplier(nodeId) {
    const targetNodeId = NodeId.from(nodeId);
    const orderedNodeIds = this.orderedNodeIds();
    const nodeIndex = orderedNodeIds.findIndex((currentNodeId) =>
      currentNodeId.equals(targetNodeId),
    );

    this.context.nodes.require(targetNodeId);

    if (nodeIndex === -1) {
      throw new Error(`Node "${targetNodeId.toString()}" não foi encontrado na árvore.`);
    }

    if (orderedNodeIds.length === 1) {
      return MAXIMUM_DECAY_MULTIPLIER;
    }

    return this.decayMultiplierAt(nodeIndex, orderedNodeIds.length);
  }

  getNode(nodeId) {
    return this.context.nodes.require(NodeId.from(nodeId)).toSnapshot();
  }

  markNodeAsMastered(nodeId) {
    const targetNode = this.context.nodes.require(NodeId.from(nodeId));

    targetNode.markAsMastered();
    this.recalculateStatuses();

    return targetNode.toSnapshot();
  }

  moveConnectionControl(nodeId, offsetX, offsetY) {
    const targetNode = this.context.nodes.require(NodeId.from(nodeId));

    targetNode.setConnectionControlOffset(offsetX, offsetY);

    return targetNode.toSnapshot();
  }

  moveNodeLayout(nodeId, offsetX, offsetY) {
    const targetNode = this.context.nodes.require(NodeId.from(nodeId));

    targetNode.setLayoutOffset(offsetX, offsetY);

    return targetNode.toSnapshot();
  }

  recalculateStatuses() {
    this.orderedNodeIds().forEach((nodeId) => {
      const currentNode = this.context.nodes.require(nodeId);

      currentNode.refreshStatus(this.findParentNodeOf(currentNode));
    });
  }

  renameNode(nodeId, title) {
    const targetNode = this.context.nodes.require(NodeId.from(nodeId));

    targetNode.rename(NodeTitle.from(title));
    this.recalculateStatuses();

    return targetNode.toSnapshot();
  }

  resetRootProgress(nodeId) {
    const rootNode = this.context.nodes.require(NodeId.from(nodeId));

    if (!rootNode.isOrigin()) {
      throw new Error("Só nós de origem podem ter o progresso resetado por essa ação.");
    }

    this.resetProgressOf(nodeId);
    this.resetSubtopicsOfOrigin(nodeId);
    this.recalculateStatuses();

    return rootNode.toSnapshot();
  }

  resetNodeForRetry(nodeId, nextProgress) {
    const targetNode = this.context.nodes.require(NodeId.from(nodeId));

    targetNode.resetForRetry(ProgressValue.from(nextProgress));
    this.recalculateStatuses();

    return targetNode.toSnapshot();
  }

  swapNodes(firstNodeId, secondNodeId) {
    const firstNodeIdentifier = NodeId.from(firstNodeId);
    const secondNodeIdentifier = NodeId.from(secondNodeId);
    const firstNode = this.context.nodes.require(firstNodeIdentifier);
    const secondNode = this.context.nodes.require(secondNodeIdentifier);

    if (!firstNode.sharesParentWith(secondNode)) {
      throw new Error("Só é possível trocar nós da mesma hierarquia.");
    }

    return this.context.hierarchy.swapSiblings(
      firstNode.parentReference(),
      firstNodeIdentifier,
      secondNodeIdentifier,
    );
  }

  syncInto(publicState) {
    publicState.childIdsByParent = this.context.hierarchy.toSnapshot();
    publicState.nextId = this.context.nodeSequence.currentValue();
    publicState.nodesById = this.context.nodes.toSnapshot();
  }

  syncRootProgress(rootNodeId) {
    const rootNode = this.context.nodes.require(NodeId.from(rootNodeId));

    rootNode.syncProgress(this.progressFromMasteredDescendantsOf(rootNode.identity()));
    this.recalculateStatuses();

    return rootNode.toSnapshot();
  }

  updateProgress(nodeId, amount) {
    const targetNode = this.context.nodes.require(NodeId.from(nodeId));

    targetNode.updateProgress(ProgressAmount.from(amount));
    this.recalculateStatuses();

    return targetNode.toSnapshot();
  }

  decayMultiplierAt(nodeIndex, totalNodeCount) {
    const decayRange = MAXIMUM_DECAY_MULTIPLIER - MINIMUM_DECAY_MULTIPLIER;
    const intervalSize = decayRange / (totalNodeCount - 1);
    const rawMultiplier = MAXIMUM_DECAY_MULTIPLIER - intervalSize * nodeIndex;

    return Number(rawMultiplier.toFixed(2));
  }

  findParentNodeOf(node) {
    const parentNodeId = node.parentReference().toNodeId();

    if (parentNodeId === null) {
      return null;
    }

    return this.context.nodes.require(parentNodeId);
  }

  orderedNodeIds() {
    return this.context.hierarchy.traverseFrom(ParentId.root());
  }

  reparentChildren(childIds, parentReference) {
    childIds.forEach((childId) => {
      this.context.nodes.require(childId).reparentTo(parentReference);
    });
  }

  syncAllRootProgresses() {
    this.context.nodes.each((treeNode) => {
      if (!treeNode.isOrigin() || treeNode.isMastered()) {
        return;
      }

      treeNode.syncProgress(this.progressFromMasteredDescendantsOf(treeNode.identity()));
    });
  }

  progressFromMasteredDescendantsOf(nodeId) {
    const originNodeId = NodeId.from(nodeId.toString());
    const progressPercent = masteredDescendantProgressPercent({
      childIdsOf: (parentNodeId) => this.context.hierarchy.childrenOf(ParentId.from(parentNodeId)),
      isMasteredNodeId: (descendantNodeId) => this.context.nodes.require(descendantNodeId).isMastered(),
      isOriginNodeId: (descendantNodeId) => this.context.nodes.require(descendantNodeId).isOrigin(),
      rootNodeId: originNodeId.toString(),
    });

    return ProgressValue.from(progressPercent);
  }

  requireParent(parentReference) {
    const parentNodeId = parentReference.toNodeId();

    if (parentNodeId === null) {
      return;
    }

    this.context.nodes.require(parentNodeId);
  }

  seedInitialTree() {
    const rootNodeId = NodeId.from("node_1");
    const additionNodeId = NodeId.from("node_2");
    const subtractionNodeId = NodeId.from("node_3");
    const rootParent = ParentId.root();
    const rootReference = ParentId.from(rootNodeId.toString());

    this.context.nodes.add(
      SkillNode.create(rootNodeId, NodeTitle.from("Matemática Básica"), rootParent),
    );
    this.context.nodes.add(
      SkillNode.create(additionNodeId, NodeTitle.from("Soma"), rootReference),
    );
    this.context.nodes.add(
      SkillNode.create(subtractionNodeId, NodeTitle.from("Subtração"), rootReference),
    );

    this.context.hierarchy.append(rootParent, rootNodeId);
    this.context.hierarchy.append(rootReference, additionNodeId);
    this.context.hierarchy.append(rootReference, subtractionNodeId);
    this.context.hierarchy.ensureBucket(ParentId.from(additionNodeId.toString()));
    this.context.hierarchy.ensureBucket(ParentId.from(subtractionNodeId.toString()));
  }

  resetProgressOf(nodeId) {
    this.context.nodes.require(NodeId.from(nodeId)).resetProgress();
  }

  resetSubtopicsOfOrigin(originNodeId) {
    const visitSubtopicChildren = (parentNodeId) => {
      this.context.hierarchy.childrenOf(ParentId.from(parentNodeId)).forEach((childNodeId) => {
        const childNode = this.context.nodes.require(childNodeId);

        if (childNode.isOrigin()) {
          return;
        }

        this.resetProgressOf(childNodeId.toString());
        visitSubtopicChildren(childNodeId.toString());
      });
    };

    visitSubtopicChildren(originNodeId);
  }
}
