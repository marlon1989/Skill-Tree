const SVG_PATH_PRECISION = 3;

export function edgePointToward(sourcePoint, targetPoint, sourceSize) {
  const angleInRadians = Math.atan2(pointY(targetPoint) - pointY(sourcePoint), pointX(targetPoint) - pointX(sourcePoint));

  return {
    x: pointX(sourcePoint) + Math.cos(angleInRadians) * sourceSize / 2,
    y: pointY(sourcePoint) + Math.sin(angleInRadians) * sourceSize / 2,
  };
}

export function midpointControlPoint(startPoint, endPoint, offsetPoint = { x: 0, y: 0 }) {
  return {
    x: (pointX(startPoint) + pointX(endPoint)) / 2 + Number(offsetPoint.x ?? 0),
    y: (pointY(startPoint) + pointY(endPoint)) / 2 + Number(offsetPoint.y ?? 0),
  };
}

export function masteryHubControlPoint(startPoint, endPoint) {
  return {
    x: (pointX(startPoint) + pointX(endPoint)) / 2,
    y: Math.min(pointY(startPoint), pointY(endPoint)) - 36,
  };
}

export function quadraticSvgPath(startPoint, controlPoint, endPoint) {
  return `M ${formattedPoint(startPoint)} Q ${formattedPoint(controlPoint)}, ${formattedPoint(endPoint)}`;
}

function formattedPoint(point) {
  return `${formatPathNumber(pointX(point))} ${formatPathNumber(pointY(point))}`;
}

function formatPathNumber(value) {
  return Number(value).toFixed(SVG_PATH_PRECISION).replace(/\.?0+$/, "");
}

function pointX(point) {
  return typeof point.x === "function" ? point.x() : Number(point.x ?? 0);
}

function pointY(point) {
  return typeof point.y === "function" ? point.y() : Number(point.y ?? 0);
}
