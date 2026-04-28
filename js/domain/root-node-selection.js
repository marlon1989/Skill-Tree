/**
 * Pick first-created root node still present in tree.
 * Example:
 *   firstCreatedRootNodeId({ node_3: { id: "node_3", parentId: null } }) === "node_3"
 */
export function firstCreatedRootNodeId(nodesById) {
  const rootNodeEntries = rootNodeSnapshots(nodesById);

  if (rootNodeEntries.length === 0) {
    return "";
  }

  return [...rootNodeEntries].sort(compareNodeCreationOrder)[0].id;
}

function rootNodeSnapshots(nodesById) {
  return Object.values(nodesById ?? {})
    .filter((node) => node?.parentId === null)
    .map((node) => ({
      id: String(node?.id ?? "").trim(),
    }))
    .filter((node) => Boolean(node.id));
}

function compareNodeCreationOrder(firstNode, secondNode) {
  return creationOrderOf(firstNode.id) - creationOrderOf(secondNode.id);
}

function creationOrderOf(nodeId) {
  const matchedNodeNumber = /^node_(\d+)$/.exec(String(nodeId));

  if (!matchedNodeNumber) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(matchedNodeNumber[1]);
}
