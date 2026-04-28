import { HtmlText } from "./html-text.js";

export class NodeIdentifier {
  constructor(value) {
    this.value = String(value ?? "");
  }

  static optional(value) {
    return new NodeIdentifier(value);
  }

  static required(value) {
    const identifier = new NodeIdentifier(value);

    if (identifier.isEmpty()) {
      throw new Error("Identificador do nó é obrigatório.");
    }

    return identifier;
  }

  isEmpty() {
    return this.value.trim() === "";
  }

  optionalMarkup() {
    return this.isEmpty() ? "" : this.toMarkup();
  }

  toMarkup() {
    return HtmlText.from(this.value).toMarkup();
  }

  toString() {
    return this.value;
  }
}
