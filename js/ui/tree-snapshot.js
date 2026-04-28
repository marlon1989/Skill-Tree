import { NODE_STATUS, ROOT_PARENT_KEY } from "../state.js";
import { createEmptyMasteryHubState, normalizeMasteryHubState } from "../domain/mastery-hub-state.js";
import { HtmlText } from "./html-text.js";
import { NodeIdentifier } from "./node-identifier.js";

export class TreeSnapshot {
  constructor(attributes) {
    this.attributes = attributes;
  }

  static empty() {
    return new TreeSnapshot({
      childHierarchy: ChildHierarchy.empty(),
      masteryHubs: createEmptyMasteryHubState().masteryHubs,
      nodes: NodeCollection.from({}),
    });
  }

  static from(input) {
    return snapshotFactoryFor(input)(input);
  }

  childIdentifiersOf(nodeIdentifier) {
    return this.attributes.childHierarchy.childrenOf(nodeIdentifier.toString());
  }

  nodeCount() {
    return this.attributes.nodes.count();
  }

  masteryHubs() {
    return this.attributes.masteryHubs;
  }

  nodes() {
    return this.attributes.nodes;
  }

  rootIdentifiers() {
    return this.attributes.nodes.rootIdentifiers(this.attributes.childHierarchy);
  }

  static fromNodeSnapshot(input) {
    return new TreeSnapshot({
      childHierarchy: ChildHierarchy.from(undefined, input),
      masteryHubs: createEmptyMasteryHubState().masteryHubs,
      nodes: NodeCollection.from(input),
    });
  }

  static fromStoreSnapshot(input) {
    return new TreeSnapshot({
      childHierarchy: ChildHierarchy.from(input.childIdsByParent, input.nodesById),
      masteryHubs: normalizeMasteryHubState(input).masteryHubs,
      nodes: NodeCollection.from(input.nodesById),
    });
  }
}

class NodeCollection {
  constructor(entries) {
    this.entries = entries;
  }

  static from(snapshot) {
    const entries = Object.values(snapshot ?? {}).map((node) => TreeNode.from(node));

    return new NodeCollection(entries);
  }

  count() {
    return this.entries.length;
  }

  each(callback) {
    this.entries.forEach(callback);
  }

  require(nodeIdentifier) {
    const node = this.entries.find((entry) => entry.id().toString() === nodeIdentifier.toString());

    if (!node) {
      throw new Error(`Nó "${nodeIdentifier.toString()}" não encontrado no snapshot.`);
    }

    return node;
  }

  rootIdentifiers(childHierarchy) {
    return childHierarchy.childrenOf(ROOT_PARENT_KEY);
  }
}

class ChildHierarchy {
  constructor(entries) {
    this.entries = entries;
  }

  static empty() {
    return new ChildHierarchy(new Map([[ROOT_PARENT_KEY, []]]));
  }

  static from(snapshot, nodesById) {
    return hierarchyFactoryFor(snapshot)(snapshot, nodesById);
  }

  static fromHierarchySnapshot(snapshot) {
    const entries = Object.entries(snapshot).map(([parentKey, childIds]) => [
      parentKey,
      childIds.map((childId) => NodeIdentifier.required(childId)),
    ]);

    return new ChildHierarchy(new Map(entries));
  }

  static fromNodesOnly(nodesById) {
    const entries = new Map([[ROOT_PARENT_KEY, []]]);

    Object.values(nodesById ?? {}).forEach((node) => {
      const parentKey = node.parentId ?? ROOT_PARENT_KEY;
      const nodeIdentifier = NodeIdentifier.required(node.id);

      ensureChildBucket(entries, parentKey);
      ensureChildBucket(entries, nodeIdentifier.toString());
      entries.get(parentKey).push(nodeIdentifier);
    });

    return new ChildHierarchy(entries);
  }

  childrenOf(parentKey) {
    return this.entries.get(parentKey) ?? [];
  }
}

export class ProgressValue {
  constructor(value) {
    this.value = Number(value) || 0;
  }

  isComplete() {
    return this.value >= 100;
  }

  isStarted() {
    return this.value > 0;
  }

  raw() {
    return this.value;
  }

  ringAngle() {
    return Math.max(0, Math.min(100, this.value)) * 3.6;
  }

  roundedLabel() {
    return `${Math.round(this.value)}%`;
  }
}

export class StatusValue {
  constructor(value) {
    this.value = String(value ?? "");
  }

  isMastered() {
    return this.value === NODE_STATUS.MASTERED || this.value === "mastered";
  }

  raw() {
    return HtmlText.from(this.value);
  }
}

class TreeNode {
  constructor(snapshot) {
    this.snapshot = snapshot;
  }

  static from(snapshot) {
    return new TreeNode(snapshot);
  }

  decayMultiplierLabel() {
    return normalizedMultiplier(this.snapshot.decayMultiplier).toFixed(2);
  }

  connectionControlOffset() {
    return {
      x: Number(this.snapshot.connectionControlOffsetX ?? 0),
      y: Number(this.snapshot.connectionControlOffsetY ?? 0),
    };
  }

  id() {
    return NodeIdentifier.required(this.snapshot.id);
  }

  isRoot() {
    return this.snapshot.parentId === null;
  }

  layoutOffset() {
    return {
      x: Number(this.snapshot.layoutOffsetX ?? 0),
      y: Number(this.snapshot.layoutOffsetY ?? 0),
    };
  }

  orderIndexLabel() {
    return String(this.snapshot.orderIndex ?? "-");
  }

  parentId() {
    return NodeIdentifier.optional(this.snapshot.parentId);
  }

  progress() {
    return new ProgressValue(this.snapshot.progress);
  }

  status() {
    return new StatusValue(this.snapshot.status);
  }

  title() {
    return HtmlText.from(this.snapshot.title);
  }
}

function ensureChildBucket(entries, key) {
  entries.has(key) || entries.set(key, []);
}

function hierarchyFactoryFor(snapshot) {
  return snapshot ? ChildHierarchy.fromHierarchySnapshot : ChildHierarchy.fromNodesOnly;
}

function normalizedMultiplier(rawValue) {
  const multiplier = Number(rawValue);

  return isValidMultiplier(multiplier) ? multiplier : 1;
}

function snapshotFactoryFor(input) {
  const factories = [
    [() => !input, TreeSnapshot.empty],
    [() => Boolean(input.nodesById), TreeSnapshot.fromStoreSnapshot],
  ];

  return factories.find(([predicate]) => predicate())?.[1] ?? TreeSnapshot.fromNodeSnapshot;
}

function isValidMultiplier(multiplier) {
  return Number.isFinite(multiplier) && multiplier > 0;
}
