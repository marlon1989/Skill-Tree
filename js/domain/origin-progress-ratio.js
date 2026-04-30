export function masteredDescendantProgressPercent(input, isMasteredNodeId = null) {
  if (Array.isArray(input)) {
    return flatMasteredDescendantProgressPercent(input, isMasteredNodeId);
  }

  return originBranchProgressPercent(input);
}

function flatMasteredDescendantProgressPercent(descendantNodeIds, isMasteredNodeId) {
  if (descendantNodeIds.length === 0) {
    return 0;
  }

  const masteredDescendantCount = descendantNodeIds.reduce((sum, nodeId) => {
    return sum + Number(isMasteredNodeId(nodeId));
  }, 0);

  return Number(((masteredDescendantCount / descendantNodeIds.length) * 100).toFixed(2));
}

function originBranchProgressPercent(input) {
  const childProgressItems = progressItemsFor(input.rootNodeId, input);

  if (childProgressItems.length === 0) {
    return 0;
  }

  const completedItemCount = childProgressItems.reduce((sum, progressItem) => {
    return sum + Number(progressItem.isComplete);
  }, 0);

  return Number(((completedItemCount / childProgressItems.length) * 100).toFixed(2));
}

function progressItemsFor(parentNodeId, input) {
  return input.childIdsOf(parentNodeId).flatMap((childNodeId) =>
    progressItemsForNode(String(childNodeId), input),
  );
}

function progressItemsForNode(nodeId, input) {
  if (!input.isOriginNodeId(nodeId)) {
    return [
      { isComplete: input.isMasteredNodeId(nodeId) },
      ...progressItemsFor(nodeId, input),
    ];
  }

  const nestedItems = progressItemsFor(nodeId, input);

  return [{
    isComplete: nestedItems.length > 0 && nestedItems.every((progressItem) => progressItem.isComplete),
  }];
}
