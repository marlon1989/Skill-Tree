import { NODE_STATUS, ROOT_PARENT_KEY } from "./domain/constants.js";
import {
  createEmptyMasteryHubState,
  freezeMasteryHubForRoot,
  moveMasteryHubPosition,
  normalizeMasteryHubState,
  renameMasteryHubTitle,
  removeMasteryHubForRoot,
  syncMasteryHubsToEligibleRoots,
} from "./domain/mastery-hub-state.js";
import { SkillTreeStore } from "./domain/skill-tree-store.js";

export { NODE_STATUS, ROOT_PARENT_KEY };

export const state = {
  nextId: 1,
  nodesById: {},
  childIdsByParent: {},
  masteryHubs: [],
  nextMasteryHubId: 1,
};

const APP_STATE_STORAGE_KEY = "skill-tree.state";
const LEGACY_VISUAL_CUSTOMIZATION_STORAGE_KEY = "skill-tree.visual-customization";

const { masteryHubState, shouldPersistState, shouldRemoveLegacyCustomization, store } = createStore();

store.syncInto(state);
applyMasteryHubState(masteryHubState);
syncMasteryHubsToTree({ persistState: false });
shouldPersistState && persistAppState();
shouldRemoveLegacyCustomization && clearLegacyVisualCustomization();

export function addNode(parentId, title, nodeKind = "subtopic", sourceMasteryHubId = "") {
  return syncStateAfter(() => store.addNode(parentId, title, nodeKind, sourceMasteryHubId));
}

export function deleteNode(nodeId) {
  const deletedRootNodeId = state.nodesById[nodeId]?.parentId === null ? String(nodeId) : "";

  return syncStateAfter(() => {
    const deletedNode = store.deleteNode(nodeId);

    if (deletedRootNodeId) {
      applyMasteryHubState(removeMasteryHubForRoot(masteryHubStateSnapshot(), deletedRootNodeId));
    }

    return deletedNode;
  });
}

export function getLinearDecayMultiplier(nodeId) {
  return store.getLinearDecayMultiplier(nodeId);
}

export function getNode(nodeId) {
  return store.getNode(nodeId);
}

export function markNodeAsMastered(nodeId) {
  return syncStateAfter(() => store.markNodeAsMastered(nodeId));
}

export function moveConnectionControl(nodeId, offsetX, offsetY, options = {}) {
  return syncNodeAfter(() => store.moveConnectionControl(nodeId, offsetX, offsetY), options);
}

export function freezeMasteryHubLayout(rootNodeId, x, y, options = {}) {
  applyMasteryHubState(freezeMasteryHubForRoot(masteryHubStateSnapshot(), rootNodeId, x, y));
  options.persistState !== false && persistAppState();

  return masteryHubStateSnapshot();
}

export function moveMasteryHub(masteryHubId, x, y, options = {}) {
  applyMasteryHubState(moveMasteryHubPosition(masteryHubStateSnapshot(), masteryHubId, x, y));
  options.persistState !== false && persistAppState();

  return masteryHubStateSnapshot();
}

export function moveNodeLayout(nodeId, offsetX, offsetY, options = {}) {
  return syncNodeAfter(() => store.moveNodeLayout(nodeId, offsetX, offsetY), options);
}

export function renameNode(nodeId, title) {
  return syncStateAfter(() => store.renameNode(nodeId, title));
}

export function resetRootProgress(nodeId) {
  return syncStateAfter(() => store.resetRootProgress(nodeId));
}

export function resetNodeForRetry(nodeId, nextProgress = 90) {
  return syncStateAfter(() => store.resetNodeForRetry(nodeId, nextProgress));
}

export function renameMasteryHub(masteryHubId, title) {
  applyMasteryHubState(renameMasteryHubTitle(masteryHubStateSnapshot(), masteryHubId, title));
  persistAppState();

  return masteryHubStateSnapshot();
}

export function syncRootProgress(rootNodeId) {
  return syncStateAfter(() => store.syncRootProgress(rootNodeId));
}

export function swapNodes(nodeIdA, nodeIdB) {
  return syncStateAfter(() => store.swapNodes(nodeIdA, nodeIdB));
}

export function updateProgress(nodeId, amount) {
  return syncStateAfter(() => store.updateProgress(nodeId, amount));
}

export function persistCurrentState() {
  persistAppState();
}

function syncStateAfter(callback, options = {}) {
  const result = callback();

  store.syncInto(state);
  syncMasteryHubsToTree({ persistState: false });
  options.persistState !== false && persistAppState();

  return result;
}

function syncNodeAfter(callback, options = {}) {
  const nodeSnapshot = callback();

  state.nodesById[nodeSnapshot.id] = nodeSnapshot;
  options.persistState !== false && persistAppState();

  return nodeSnapshot;
}

function createStore() {
  const scaffoldedStore = SkillTreeStore.scaffold();

  if (!hasLocalStorage()) {
    return {
      masteryHubState: createEmptyMasteryHubState(),
      shouldPersistState: false,
      shouldRemoveLegacyCustomization: false,
      store: scaffoldedStore,
    };
  }

  const savedAppState = readPersistedAppState();

  if (savedAppState) {
    try {
      return {
        masteryHubState: normalizeMasteryHubState(savedAppState),
        shouldPersistState: false,
        shouldRemoveLegacyCustomization: false,
        store: SkillTreeStore.fromSnapshot(savedAppState),
      };
    } catch (error) {
      void error;
    }
  }

  const legacyCustomization = readLegacyVisualCustomization();
  const hasLegacyCustomization = Object.keys(legacyCustomization).length > 0;

  if (hasLegacyCustomization) {
    applyLegacyVisualCustomization(scaffoldedStore, legacyCustomization);
  }

  return {
    masteryHubState: createEmptyMasteryHubState(),
    shouldPersistState: hasLegacyCustomization,
    shouldRemoveLegacyCustomization: hasLegacyCustomization,
    store: scaffoldedStore,
  };
}

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function persistAppState() {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    APP_STATE_STORAGE_KEY,
    JSON.stringify(appStateSnapshot()),
  );
}

function readPersistedAppState() {
  try {
    const rawValue = window.localStorage.getItem(APP_STATE_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    return normalizeAppState(JSON.parse(rawValue));
  } catch (error) {
    void error;

    return null;
  }
}

function normalizeAppState(rawState) {
  const normalizedNodesById = Object.fromEntries(
    Object.entries(rawState?.nodesById ?? {}).map(([nodeId, node]) => [
      nodeId,
      {
        connectionControlOffsetX: numericValueOf(node?.connectionControlOffsetX),
        connectionControlOffsetY: numericValueOf(node?.connectionControlOffsetY),
        id: String(node?.id ?? nodeId),
        layoutOffsetX: numericValueOf(node?.layoutOffsetX),
        layoutOffsetY: numericValueOf(node?.layoutOffsetY),
        nodeKind: normalizedNodeKindOf(node?.nodeKind, node?.parentId),
        parentId: node?.parentId === null ? null : String(node?.parentId ?? ""),
        progress: clampedProgressValueOf(node?.progress),
        sourceMasteryHubId: String(node?.sourceMasteryHubId ?? "").trim(),
        status: String(node?.status ?? ""),
        title: String(node?.title ?? "").trim(),
      },
    ]),
  );

  return {
    childIdsByParent: Object.fromEntries(
      Object.entries(rawState?.childIdsByParent ?? {}).map(([parentKey, childIds]) => [
        String(parentKey),
        Array.isArray(childIds)
          ? childIds.map((childId) => String(childId ?? "").trim()).filter(Boolean)
          : [],
      ]),
    ),
    ...normalizeMasteryHubState(rawState),
    nextId: numericValueOf(rawState?.nextId) || 1,
    nodesById: normalizedNodesById,
  };
}

function readLegacyVisualCustomization() {
  try {
    const rawValue = window.localStorage.getItem(LEGACY_VISUAL_CUSTOMIZATION_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    return normalizeLegacyVisualCustomization(JSON.parse(rawValue));
  } catch (error) {
    void error;

    return {};
  }
}

function normalizeLegacyVisualCustomization(rawCustomization) {
  return Object.fromEntries(
    Object.entries(rawCustomization ?? {}).map(([nodeId, customization]) => [
      nodeId,
      {
        connectionControlOffsetX: numericValueOf(customization?.connectionControlOffsetX),
        connectionControlOffsetY: numericValueOf(customization?.connectionControlOffsetY),
        layoutOffsetX: numericValueOf(customization?.layoutOffsetX),
        layoutOffsetY: numericValueOf(customization?.layoutOffsetY),
      },
    ]),
  );
}

function applyLegacyVisualCustomization(targetStore, savedCustomization) {
  Object.entries(savedCustomization).forEach(([nodeId, customization]) => {
    try {
      targetStore.moveNodeLayout(
        nodeId,
        customization.layoutOffsetX,
        customization.layoutOffsetY,
      );
      targetStore.moveConnectionControl(
        nodeId,
        customization.connectionControlOffsetX,
        customization.connectionControlOffsetY,
      );
    } catch (error) {
      void error;
    }
  });
}

function clearLegacyVisualCustomization() {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(LEGACY_VISUAL_CUSTOMIZATION_STORAGE_KEY);
}

function numericValueOf(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function clampedProgressValueOf(value) {
  return Math.max(0, Math.min(100, numericValueOf(value)));
}

function appStateSnapshot() {
  return {
    childIdsByParent: Object.fromEntries(
      Object.entries(state.childIdsByParent ?? {}).map(([parentKey, childIds]) => [
        parentKey,
        Array.isArray(childIds) ? [...childIds] : [],
      ]),
    ),
    ...masteryHubStateSnapshot(),
    nextId: numericValueOf(state.nextId) || 1,
    nodesById: Object.fromEntries(
      Object.values(state.nodesById ?? {}).map((node) => [
        node.id,
        {
          connectionControlOffsetX: numericValueOf(node.connectionControlOffsetX),
          connectionControlOffsetY: numericValueOf(node.connectionControlOffsetY),
          id: String(node.id),
          layoutOffsetX: numericValueOf(node.layoutOffsetX),
          layoutOffsetY: numericValueOf(node.layoutOffsetY),
          nodeKind: normalizedNodeKindOf(node.nodeKind, node.parentId),
          parentId: node.parentId === null ? null : String(node.parentId),
          progress: clampedProgressValueOf(node.progress),
          sourceMasteryHubId: String(node.sourceMasteryHubId ?? "").trim(),
          status: String(node.status),
          title: String(node.title),
        },
      ]),
    ),
  };
}

function normalizedNodeKindOf(rawNodeKind, rawParentId) {
  if (rawParentId === null || rawNodeKind === "origin") {
    return "origin";
  }

  return "subtopic";
}

function applyMasteryHubState(masteryHubState) {
  state.masteryHubs = masteryHubState.masteryHubs;
  state.nextMasteryHubId = masteryHubState.nextMasteryHubId;
}

function masteryHubStateSnapshot() {
  return {
    masteryHubs: state.masteryHubs.map((masteryHub) => ({ ...masteryHub })),
    nextMasteryHubId: numericValueOf(state.nextMasteryHubId) || 1,
  };
}

function syncMasteryHubsToTree(options = {}) {
  applyMasteryHubState(syncMasteryHubsToEligibleRoots(
    masteryHubStateSnapshot(),
    state.nodesById,
    state.childIdsByParent,
  ));

  options.persistState && persistAppState();
}

