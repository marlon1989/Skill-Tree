export function coreSizeFor(treeNode, layoutTokens) {
  return treeNode.isOrigin() ? layoutTokens.rootCoreSize() : layoutTokens.coreSize();
}

export function maxNodeSizeFor(layoutTokens) {
  return Math.max(layoutTokens.nodeSize(), layoutTokens.rootNodeSize());
}

export function nodeSizeFor(treeNode, layoutTokens) {
  return treeNode.isOrigin() ? layoutTokens.rootNodeSize() : layoutTokens.nodeSize();
}

export function orbitRadiusFor(depthValue, layoutTokens) {
  return layoutTokens.rootOrbitRadius() + depthValue * layoutTokens.depthRingGap();
}
