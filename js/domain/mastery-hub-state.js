/**
 * Build mastery-hub collection snapshot.
 * Example:
 *   createEmptyMasteryHubState().masteryHubs.length === 0
 */
export function createEmptyMasteryHubState() {
  return {
    masteryHubs: [],
    nextMasteryHubId: 1,
  };
}

/**
 * Normalize persisted mastery hubs, including legacy single-hub snapshot.
 * Example:
 *   normalizeMasteryHubState({ masteryHubs: [] }).nextMasteryHubId === 1
 */
export function normalizeMasteryHubState(rawState) {
  const legacyHubEntries = normalizedLegacyHubEntries(rawState?.masteryHub);
  const rawHubEntries = Array.isArray(rawState?.masteryHubs)
    ? rawState.masteryHubs
    : legacyHubEntries;
  const masteryHubs = rawHubEntries.map(normalizeMasteryHubEntry).filter(isVisibleLinkedHub);

  return {
    masteryHubs,
    nextMasteryHubId: Math.max(
      numericValueOf(rawState?.nextMasteryHubId) || 1,
      highestMasteryHubNumber(masteryHubs) + 1,
    ),
  };
}

/**
 * Create or reposition hub linked to one root node.
 * Example:
 *   upsertMasteryHub(createEmptyMasteryHubState(), "node_1", 20, 30).masteryHubs.length === 1
 */
export function upsertMasteryHub(masteryHubState, linkedRootNodeId, x, y) {
  const safeState = normalizeMasteryHubState(masteryHubState);
  const normalizedRootNodeId = String(linkedRootNodeId ?? "").trim();

  if (!normalizedRootNodeId) {
    throw new Error('Root da maestria inválido: "". Esperado id de nó de origem.');
  }

  const existingHub = safeState.masteryHubs.find(
    (masteryHub) => masteryHub.linkedRootNodeId === normalizedRootNodeId,
  );

  if (existingHub) {
    return {
      ...safeState,
      masteryHubs: safeState.masteryHubs.map((masteryHub) =>
        masteryHub.id === existingHub.id
          ? {
            ...masteryHub,
            placementMode: "manual",
            x: numericValueOf(x),
            y: numericValueOf(y),
          }
          : masteryHub,
      ),
    };
  }

  const nextMasteryHubId = safeState.nextMasteryHubId;

  return {
    masteryHubs: [
      ...safeState.masteryHubs,
      {
        id: `mastery_hub_${nextMasteryHubId}`,
        linkedRootNodeId: normalizedRootNodeId,
        placementMode: "manual",
        title: "",
        x: numericValueOf(x),
        y: numericValueOf(y),
      },
    ],
    nextMasteryHubId: nextMasteryHubId + 1,
  };
}

/**
 * Check whether root already owns visible mastery hub.
 * Example:
 *   hasMasteryHubForRoot({ masteryHubs: [{ linkedRootNodeId: "node_1" }] }, "node_1") === true
 */
export function hasMasteryHubForRoot(masteryHubState, linkedRootNodeId) {
  const normalizedRootNodeId = String(linkedRootNodeId ?? "").trim();

  if (!normalizedRootNodeId) {
    return false;
  }

  return normalizeMasteryHubState(masteryHubState).masteryHubs.some(
    (masteryHub) => masteryHub.linkedRootNodeId === normalizedRootNodeId,
  );
}

/**
 * Keep mastery hubs aligned with root nodes that already have at least one child.
 * Example:
 *   syncMasteryHubsToEligibleRoots(createEmptyMasteryHubState(), { node_1: { id: "node_1", parentId: null } }, { node_1: ["node_2"] }).masteryHubs.length === 1
 */
export function syncMasteryHubsToEligibleRoots(masteryHubState, nodesById, childIdsByParent) {
  const safeState = normalizeMasteryHubState(masteryHubState);
  const eligibleRootNodeIds = eligibleRootIdsOf(nodesById, childIdsByParent);
  const retainedMasteryHubs = safeState.masteryHubs.filter((masteryHub) =>
    eligibleRootNodeIds.includes(masteryHub.linkedRootNodeId),
  );
  const nextMasteryHubs = [...retainedMasteryHubs];
  let nextMasteryHubId = safeState.nextMasteryHubId;

  eligibleRootNodeIds.forEach((rootNodeId) => {
    if (retainedMasteryHubs.some((masteryHub) => masteryHub.linkedRootNodeId === rootNodeId)) {
      return;
    }

    nextMasteryHubs.push({
      id: `mastery_hub_${nextMasteryHubId}`,
      linkedRootNodeId: rootNodeId,
      placementMode: "auto",
      title: "",
      x: 0,
      y: 0,
    });
    nextMasteryHubId += 1;
  });

  return {
    masteryHubs: nextMasteryHubs,
    nextMasteryHubId,
  };
}

/**
 * Rename one mastery hub without changing linked root.
 * Example:
 *   renameMasteryHubTitle({ masteryHubs: [{ id: "mastery_hub_1", linkedRootNodeId: "node_1", title: "" }] }, "mastery_hub_1", "Algebra").masteryHubs[0].title === "Algebra"
 */
export function renameMasteryHubTitle(masteryHubState, masteryHubId, title) {
  const safeState = normalizeMasteryHubState(masteryHubState);
  const normalizedMasteryHubId = String(masteryHubId ?? "").trim();
  const normalizedTitle = String(title ?? "").trim();

  if (!normalizedMasteryHubId) {
    throw new Error('Círculo de maestria inválido: "". Esperado id de maestria existente.');
  }

  const targetHub = safeState.masteryHubs.find((masteryHub) => masteryHub.id === normalizedMasteryHubId);

  if (!targetHub) {
    throw new Error(
      `Círculo de maestria inválido: "${normalizedMasteryHubId}". ` +
      "Esperado id de maestria existente.",
    );
  }

  return {
    ...safeState,
    masteryHubs: safeState.masteryHubs.map((masteryHub) =>
      masteryHub.id === normalizedMasteryHubId
        ? { ...masteryHub, title: normalizedTitle }
        : masteryHub),
  };
}

/**
 * Move one mastery hub and switch it to manual placement.
 * Example:
 *   moveMasteryHubPosition(state, "mastery_hub_1", 40, 70).masteryHubs[0].x === 40
 */
export function moveMasteryHubPosition(masteryHubState, masteryHubId, x, y) {
  const safeState = normalizeMasteryHubState(masteryHubState);
  const normalizedMasteryHubId = String(masteryHubId ?? "").trim();

  if (!normalizedMasteryHubId) {
    throw new Error('Círculo de maestria inválido: "". Esperado id de maestria existente.');
  }

  requireMasteryHub(safeState.masteryHubs, normalizedMasteryHubId);

  return {
    ...safeState,
    masteryHubs: safeState.masteryHubs.map((masteryHub) =>
      masteryHub.id === normalizedMasteryHubId
        ? manualPositionedHub(masteryHub, x, y)
        : masteryHub),
  };
}

/**
 * Freeze auto hub linked to a root before root drag moves independently.
 * Example:
 *   freezeMasteryHubForRoot(state, "node_1", 40, 70).masteryHubs[0].placementMode === "manual"
 */
export function freezeMasteryHubForRoot(masteryHubState, linkedRootNodeId, x, y) {
  const safeState = normalizeMasteryHubState(masteryHubState);
  const normalizedRootNodeId = String(linkedRootNodeId ?? "").trim();

  if (!normalizedRootNodeId) {
    return safeState;
  }

  return {
    ...safeState,
    masteryHubs: safeState.masteryHubs.map((masteryHub) =>
      masteryHub.linkedRootNodeId === normalizedRootNodeId
        ? manualPositionedHub(masteryHub, x, y)
        : masteryHub),
  };
}

/**
 * Remove hubs attached to deleted root node.
 * Example:
 *   removeMasteryHubForRoot(state, "node_1").masteryHubs.length === 0
 */
export function removeMasteryHubForRoot(masteryHubState, linkedRootNodeId) {
  const safeState = normalizeMasteryHubState(masteryHubState);
  const normalizedRootNodeId = String(linkedRootNodeId ?? "").trim();

  return {
    ...safeState,
    masteryHubs: safeState.masteryHubs.filter(
      (masteryHub) => masteryHub.linkedRootNodeId !== normalizedRootNodeId,
    ),
  };
}

function highestMasteryHubNumber(masteryHubs) {
  return masteryHubs.reduce((highestValue, masteryHub) => {
    const matchedNumber = String(masteryHub.id).match(/mastery_hub_(\d+)$/);

    if (!matchedNumber) {
      return highestValue;
    }

    return Math.max(highestValue, Number(matchedNumber[1]));
  }, 0);
}

function isVisibleLinkedHub(masteryHub) {
  return Boolean(masteryHub.linkedRootNodeId);
}

function manualPositionedHub(masteryHub, x, y) {
  return {
    ...masteryHub,
    placementMode: "manual",
    x: numericValueOf(x),
    y: numericValueOf(y),
  };
}

function requireMasteryHub(masteryHubs, normalizedMasteryHubId) {
  const targetHub = masteryHubs.find((masteryHub) => masteryHub.id === normalizedMasteryHubId);

  if (!targetHub) {
    throw new Error(
      `Círculo de maestria inválido: "${normalizedMasteryHubId}". ` +
      "Esperado id de maestria existente.",
    );
  }

  return targetHub;
}

function normalizedLegacyHubEntries(rawLegacyHub) {
  if (rawLegacyHub?.isVisible !== true) {
    return [];
  }

  return [{
    id: "mastery_hub_1",
    linkedRootNodeId: "",
    placementMode: "manual",
    title: "",
    x: rawLegacyHub.x,
    y: rawLegacyHub.y,
  }];
}

function normalizeMasteryHubEntry(rawEntry) {
  return {
    id: String(rawEntry?.id ?? ""),
    linkedRootNodeId: String(rawEntry?.linkedRootNodeId ?? "").trim(),
    placementMode: normalizedPlacementMode(rawEntry?.placementMode),
    title: String(rawEntry?.title ?? "").trim(),
    x: numericValueOf(rawEntry?.x),
    y: numericValueOf(rawEntry?.y),
  };
}

function eligibleRootIdsOf(nodesById, childIdsByParent) {
  return Object.values(nodesById ?? {})
    .filter((node) => node?.parentId === null)
    .map((node) => String(node?.id ?? "").trim())
    .filter((rootNodeId) => Boolean(rootNodeId))
    .filter((rootNodeId) => Array.isArray(childIdsByParent?.[rootNodeId]) && childIdsByParent[rootNodeId].length > 0);
}

function numericValueOf(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizedPlacementMode(rawPlacementMode) {
  return rawPlacementMode === "auto" ? "auto" : "manual";
}
