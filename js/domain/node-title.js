export class NodeTitle {
  constructor(value) {
    this.value = value;
  }

  static from(rawValue) {
    const normalizedValue = String(rawValue ?? "").trim();

    if (!normalizedValue) {
      throw new Error("Título do nó é obrigatório.");
    }

    return new NodeTitle(normalizedValue);
  }

  toString() {
    return this.value;
  }
}
