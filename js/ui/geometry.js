import { LayoutTokens } from "./layout-tokens.js";

export class CartesianPoint {
  constructor(x, y) {
    this.coordinates = { x, y };
  }

  x() {
    return this.coordinates.x;
  }

  y() {
    return this.coordinates.y;
  }
}

export class ElementBox {
  constructor(width, height) {
    this.dimensions = { height, width };
  }

  height() {
    return this.dimensions.height;
  }

  width() {
    return this.dimensions.width;
  }
}

export class MenuPosition {
  constructor(x, y) {
    this.coordinates = {
      x: Number(x),
      y: Number(y),
    };
  }

  static from(x, y) {
    return new MenuPosition(x, y);
  }

  boundTo(elementBox) {
    const viewport = Viewport.current();
    const layoutTokens = LayoutTokens.default();
    const left = boundedCoordinate(
      this.coordinates.x,
      layoutTokens.menuMargin(),
      viewport.width() - elementBox.width() - layoutTokens.menuMargin(),
    );
    const top = boundedCoordinate(
      this.coordinates.y,
      layoutTokens.menuMargin(),
      viewport.height() - elementBox.height() - layoutTokens.menuMargin(),
    );

    return new MenuPosition(left, top);
  }

  left() {
    return this.coordinates.x;
  }

  top() {
    return this.coordinates.y;
  }
}

export class StageSize {
  constructor(width, height) {
    this.dimensions = { height, width };
  }

  static viewport() {
    return new StageSize(window.innerWidth, window.innerHeight);
  }

  height() {
    return this.dimensions.height;
  }

  width() {
    return this.dimensions.width;
  }
}

export class Viewport {
  constructor(width, height) {
    this.dimensions = { height, width };
  }

  static current() {
    return new Viewport(window.innerWidth, window.innerHeight);
  }

  height() {
    return this.dimensions.height;
  }

  width() {
    return this.dimensions.width;
  }
}

function boundedCoordinate(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}
