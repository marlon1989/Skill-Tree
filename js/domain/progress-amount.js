export class ProgressAmount {
  constructor(value) {
    this.value = value;
  }

  static from(rawValue) {
    const normalizedValue = Number(rawValue);

    if (Number.isNaN(normalizedValue)) {
      throw new Error("Amount deve ser numérico.");
    }

    return new ProgressAmount(normalizedValue);
  }

  toNumber() {
    return this.value;
  }
}
