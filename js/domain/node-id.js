export class NodeId {
  constructor(value) {
    this.value = value;
  }

  static from(rawValue) {
    const normalizedValue = String(rawValue ?? "").trim();

    if (!normalizedValue) {
      throw new Error("Identificador de nó é obrigatório.");
    }

    return new NodeId(normalizedValue);
  }

  equals(otherNodeId) {
    return this.value === otherNodeId.value;
  }

  toString() {
    return this.value;
  }
}
