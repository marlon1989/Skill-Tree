import { ROOT_PARENT_KEY } from "./constants.js";
import { NodeId } from "./node-id.js";
import { ParentId } from "./parent-id.js";

export class ChildHierarchy {
  constructor(buckets) {
    this.buckets = buckets;
  }

  static empty() {
    return new ChildHierarchy(new Map());
  }

  static fromSnapshot(snapshot, nodeIds = []) {
    const buckets = new Map();

    Object.entries(snapshot ?? {}).forEach(([bucketKey, childIds]) => {
      const normalizedChildIds = Array.isArray(childIds)
        ? childIds.map((childId) => String(childId ?? "").trim()).filter(Boolean)
        : [];

      buckets.set(String(bucketKey), normalizedChildIds);
    });

    if (!buckets.has(ROOT_PARENT_KEY)) {
      buckets.set(ROOT_PARENT_KEY, []);
    }

    nodeIds.forEach((nodeId) => {
      if (!buckets.has(nodeId)) {
        buckets.set(nodeId, []);
      }
    });

    return new ChildHierarchy(buckets);
  }

  append(parentReference, nodeId) {
    this.ensureBucket(parentReference).push(nodeId.toString());
  }

  childrenOf(parentReference) {
    return this.ensureBucket(parentReference).map((nodeKey) => NodeId.from(nodeKey));
  }

  removeBucket(parentReference) {
    this.buckets.delete(parentReference.toBucketKey());
  }

  replaceNodeWithChildren(node, childIds) {
    const siblings = this.ensureBucket(node.parentReference());
    const nodeKey = node.identity().toString();
    const nodeIndex = siblings.indexOf(nodeKey);

    if (nodeIndex === -1) {
      throw new Error(`Node "${nodeKey}" não está na hierarquia esperada.`);
    }

    siblings.splice(nodeIndex, 1, ...childIds.map((childId) => childId.toString()));
  }

  swapSiblings(parentReference, firstNodeId, secondNodeId) {
    const siblings = this.ensureBucket(parentReference);
    const firstNodeIndex = siblings.indexOf(firstNodeId.toString());
    const secondNodeIndex = siblings.indexOf(secondNodeId.toString());

    if (firstNodeIndex === -1 || secondNodeIndex === -1) {
      throw new Error("Nós não encontrados na ordem atual da hierarquia.");
    }

    [siblings[firstNodeIndex], siblings[secondNodeIndex]] = [
      siblings[secondNodeIndex],
      siblings[firstNodeIndex],
    ];

    return [...siblings];
  }

  toSnapshot() {
    const snapshot = {};

    this.buckets.forEach((nodeIds, bucketKey) => {
      snapshot[bucketKey] = [...nodeIds];
    });

    return snapshot;
  }

  traverseFrom(parentReference) {
    const orderedNodeIds = [];

    const visitNode = (nodeId) => {
      orderedNodeIds.push(nodeId);
      this.childrenOf(ParentId.from(nodeId.toString())).forEach(visitNode);
    };

    this.childrenOf(parentReference).forEach(visitNode);

    return orderedNodeIds;
  }

  ensureBucket(parentReference) {
    const bucketKey = parentReference.toBucketKey();

    if (!this.buckets.has(bucketKey)) {
      this.buckets.set(bucketKey, []);
    }

    return this.buckets.get(bucketKey);
  }
}
