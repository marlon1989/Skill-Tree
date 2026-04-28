/**
 * Resolve parent id for origin-node creation from context menu.
 * Example:
 *   contextOriginParentId({ node_2: { id: "node_2", parentId: "node_1" } }, "node_2") === "node_2"
 */
export function contextOriginParentId(nodesById, selectedNodeId) {
  const normalizedSelectedNodeId = String(selectedNodeId ?? "").trim();

  if (!normalizedSelectedNodeId) {
    return null;
  }

  const selectedNode = nodesById?.[normalizedSelectedNodeId];

  if (!selectedNode) {
    return null;
  }

  return selectedNode.parentId === null ? null : normalizedSelectedNodeId;
}
