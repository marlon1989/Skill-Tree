const ANGLE_CIRCLE = 360;
const DEFAULT_ROOT_START_ANGLE = -90;
const SINGLE_ROOT_ARC_SPAN = 240;
const MINIMUM_CHILD_ARC_SPAN = 12;
const ROOT_ARC_PADDING_RATIO = 0.18;
const SUBTREE_ARC_SHRINK_RATIO = 0.74;

/**
 * Create radial sectors for each root branch.
 * Example:
 *   createRootSectors(4)[0].centerAngle === -90
 */
export function createRootSectors(rootCount) {
  if (rootCount <= 0) {
    return [];
  }

  if (rootCount === 1) {
    return [angleRange(DEFAULT_ROOT_START_ANGLE, SINGLE_ROOT_ARC_SPAN)];
  }

  const angleStep = ANGLE_CIRCLE / rootCount;
  const usableSpan = angleStep * (1 - ROOT_ARC_PADDING_RATIO);

  return Array.from({ length: rootCount }, (_, rootIndex) =>
    angleRange(DEFAULT_ROOT_START_ANGLE + rootIndex * angleStep, usableSpan),
  );
}

/**
 * Split parent sector into child-sized sectors.
 * Example:
 *   childSector(angleRange(0, 80), 3, 1).centerAngle === 0
 */
export function childSector(parentSector, childCount, childIndex) {
  if (childCount <= 1) {
    return angleRange(parentSector.centerAngle, MINIMUM_CHILD_ARC_SPAN);
  }

  const childSlotSpan = parentSector.span / childCount;
  const childCenterAngle =
    parentSector.startAngle + childSlotSpan * childIndex + childSlotSpan / 2;
  const childArcSpan = Math.max(
    MINIMUM_CHILD_ARC_SPAN,
    childSlotSpan * SUBTREE_ARC_SHRINK_RATIO,
  );

  return angleRange(childCenterAngle, childArcSpan);
}

/**
 * Convert polar coordinates into stage coordinates.
 * Example:
 *   pointOnOrbit({ x: 100, y: 100 }, 50, -90).y === 50
 */
export function pointOnOrbit(centerPoint, radiusValue, angleInDegrees) {
  const angleInRadians = degreesToRadians(angleInDegrees);

  return {
    x: centerPoint.x + radiusValue * Math.cos(angleInRadians),
    y: centerPoint.y + radiusValue * Math.sin(angleInRadians),
  };
}

function angleRange(centerAngle, span) {
  return {
    centerAngle,
    endAngle: centerAngle + span / 2,
    span,
    startAngle: centerAngle - span / 2,
  };
}

function degreesToRadians(angleInDegrees) {
  return (angleInDegrees * Math.PI) / 180;
}
