export function masteredDescendantProgressPercent(descendantNodeIds, isMasteredNodeId) {
  if (descendantNodeIds.length === 0) {
    return 0;
  }

  const masteredDescendantCount = descendantNodeIds.reduce((sum, nodeId) => {
    return sum + Number(isMasteredNodeId(nodeId));
  }, 0);

  return Number(((masteredDescendantCount / descendantNodeIds.length) * 100).toFixed(2));
}
