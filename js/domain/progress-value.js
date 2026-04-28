export class ProgressValue {
  constructor(value) {
    this.value = value;
  }

  static complete() {
    return new ProgressValue(100);
  }

  static from(rawValue) {
    const normalizedValue = Number(rawValue);

    if (Number.isNaN(normalizedValue)) {
      throw new Error("Valor de progresso deve ser numérico.");
    }

    return new ProgressValue(Math.max(0, Math.min(100, normalizedValue)));
  }

  static zero() {
    return new ProgressValue(0);
  }

  hasStarted() {
    return this.value > 0;
  }

  increaseBy(progressAmount) {
    return ProgressValue.from(this.value + progressAmount.toNumber());
  }

  isComplete() {
    return this.value >= 100;
  }

  toNumber() {
    return this.value;
  }
}
