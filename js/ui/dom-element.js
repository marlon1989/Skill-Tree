import { ElementBox } from "./geometry.js";
import { LayoutTokens } from "./layout-tokens.js";

export class DomElement {
  constructor(element) {
    this.element = element;
  }

  static require(id) {
    const element = document.getElementById(id);

    if (!element) {
      throw new Error(`Elemento "${id}" não encontrado no DOM.`);
    }

    return new DomElement(element);
  }

  addClass(className) {
    this.element.classList.add(className);
  }

  measure() {
    const layoutTokens = LayoutTokens.default();
    const width = this.element.offsetWidth || layoutTokens.fallbackMenuWidth();
    const height = this.element.offsetHeight || layoutTokens.fallbackMenuHeight();

    return new ElementBox(width, height);
  }

  removeClass(className) {
    this.element.classList.remove(className);
  }

  setAriaHidden(value) {
    this.element.setAttribute("aria-hidden", String(value));
  }

  setDataAttribute(name, value) {
    this.element.dataset[name] = String(value);
  }

  setHtml(markup) {
    this.element.innerHTML = markup;
  }

  setLeft(value) {
    this.element.style.left = `${value}px`;
  }

  setText(value) {
    this.element.textContent = value;
  }

  setTop(value) {
    this.element.style.top = `${value}px`;
  }

  setViewBox(stageSize) {
    this.element.setAttribute("viewBox", `0 0 ${stageSize.width()} ${stageSize.height()}`);
  }

  sizeTo(stageSize) {
    this.element.style.width = `${stageSize.width()}px`;
    this.element.style.height = `${stageSize.height()}px`;
  }
}
