export class HtmlText {
  constructor(value) {
    this.value = String(value);
  }

  static from(value) {
    return new HtmlText(value);
  }

  toMarkup() {
    return this.value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  toString() {
    return this.value;
  }
}
