import { CartesianPoint } from "./geometry.js";

export class NodePosition {
  constructor(left, top, nodeSize) {
    this.coordinates = { left, top };
    this.nodeSizeValue = nodeSize;
  }

  static fromCenter(centerSnapshot, nodeSize, layoutOffset = { x: 0, y: 0 }) {
    return new NodePosition(
      centerSnapshot.x - nodeSize / 2 + layoutOffset.x,
      centerSnapshot.y - nodeSize / 2 + layoutOffset.y,
      nodeSize,
    );
  }

  centerPoint() {
    return new CartesianPoint(this.left() + this.size() / 2, this.top() + this.size() / 2);
  }

  left() {
    return this.coordinates.left;
  }

  linkPointToward(targetPoint) {
    const centerPoint = this.centerPoint();
    const angleInRadians = Math.atan2(
      targetPoint.y() - centerPoint.y(),
      targetPoint.x() - centerPoint.x(),
    );

    return new CartesianPoint(
      centerPoint.x() + Math.cos(angleInRadians) * this.size() / 2,
      centerPoint.y() + Math.sin(angleInRadians) * this.size() / 2,
    );
  }

  size() {
    return this.nodeSizeValue;
  }

  top() {
    return this.coordinates.top;
  }
}

export class NodePositionMap {
  constructor(entries) {
    this.entries = entries;
  }

  static empty() {
    return new NodePositionMap(new Map());
  }

  add(nodeIdentifier, nodePosition) {
    this.entries.set(nodeIdentifier.toString(), nodePosition);
  }

  require(nodeIdentifier) {
    const position = this.entries.get(nodeIdentifier.toString());

    if (!position) {
      throw new Error(`Posição do nó "${nodeIdentifier.toString()}" não encontrada.`);
    }

    return position;
  }
}
