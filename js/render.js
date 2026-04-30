import {
  MAXIMUM_DECAY_MULTIPLIER,
  MINIMUM_DECAY_MULTIPLIER,
  ROOT_PARENT_KEY,
} from "./domain/constants.js";
import { state } from "./state.js";
import { renderTree } from "./ui.js";

function cloneHierarchy(childIdsByParent) {
  const clonedEntries = Object.entries(childIdsByParent ?? {}).map(copyHierarchyEntry);

  return Object.fromEntries(clonedEntries);
}

function orderedNodeIdsFrom(treeState) {
  const orderedNodeIds = [];

  const visitChildren = (parentKey) => {
    const childIds = treeState.childIdsByParent[parentKey] ?? [];

    childIds.forEach((childId) => {
      orderedNodeIds.push(childId);
      visitChildren(childId);
    });
  };

  visitChildren(ROOT_PARENT_KEY);

  return orderedNodeIds;
}

export function createRenderableState(treeState = state) {
  const nodesById = clonedNodes(treeState.nodesById);
  const orderedNodeIds = orderedNodeIdsFrom(treeState);

  orderedNodeIds.forEach((nodeId, index) => {
    if (!nodesById[nodeId]) {
      return;
    }

    nodesById[nodeId].orderIndex = index + 1;
    nodesById[nodeId].decayMultiplier = decayMultiplierAt(index, orderedNodeIds.length);
  });

  return {
    childIdsByParent: cloneHierarchy(treeState.childIdsByParent),
    masteryHubs: cloneMasteryHubs(treeState.masteryHubs),
    nextMasteryHubId: Number(treeState.nextMasteryHubId ?? 1),
    nextId: treeState.nextId,
    nodesById,
  };
}

export function renderApp(treeState = state) {
  renderTree(createRenderableState(treeState));
}

function clonedNodes(nodesById) {
  const clonedEntries = Object.values(nodesById ?? {}).map(copyNodeEntry);

  return Object.fromEntries(clonedEntries);
}

function copyHierarchyEntry([parentKey, childIds]) {
  return [parentKey, [...childIds]];
}

function copyNodeEntry(node) {
  return [node.id, { ...node }];
}

function decayMultiplierAt(nodeIndex, totalNodeCount) {
  if (totalNodeCount === 1) {
    return MAXIMUM_DECAY_MULTIPLIER;
  }

  const decayRange = MAXIMUM_DECAY_MULTIPLIER - MINIMUM_DECAY_MULTIPLIER;
  const intervalSize = decayRange / (totalNodeCount - 1);
  const rawMultiplier = MAXIMUM_DECAY_MULTIPLIER - intervalSize * nodeIndex;

  return Number(rawMultiplier.toFixed(2));
}

function cloneMasteryHubs(masteryHubs) {
  return Array.isArray(masteryHubs)
    ? masteryHubs.map((masteryHub) => ({
      id: String(masteryHub?.id ?? ""),
      linkedRootNodeId: String(masteryHub?.linkedRootNodeId ?? ""),
      placementMode: String(masteryHub?.placementMode ?? "manual"),
      title: String(masteryHub?.title ?? ""),
      x: Number(masteryHub?.x ?? 0),
      y: Number(masteryHub?.y ?? 0),
    }))
    : [];
}
