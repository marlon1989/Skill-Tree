/**
 * Convert mastery subtree metrics into safe completion percentage.
 * Example:
 *   masteryHubCompletionPercentage({ masteredNodeCount: 1, nodeCount: 4 }) === 25
 */
export function masteryHubCompletionPercentage(linkedRootMetrics) {
  const nodeCount = numericMetricValue(linkedRootMetrics?.nodeCount);

  if (nodeCount <= 0) {
    return 0;
  }

  const masteredNodeCount = numericMetricValue(linkedRootMetrics?.masteredNodeCount);
  const safeRatio = Math.max(0, Math.min(1, masteredNodeCount / nodeCount));

  return Number((safeRatio * 100).toFixed(2));
}

function numericMetricValue(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}
