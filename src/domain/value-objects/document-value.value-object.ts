export class DocumentValue {
  constructor(private readonly value: number) {
    if (value < 0) {
      throw new Error('Document value cannot be negative');
    }
  }

  getValue(): number {
    return this.value;
  }

  multiply(factor: number): DocumentValue {
    return new DocumentValue(this.value * factor);
  }

  square(): DocumentValue {
    return new DocumentValue(this.value ** 2);
  }

  sqrt(): DocumentValue {
    return new DocumentValue(Math.sqrt(this.value));
  }

  equals(other: DocumentValue): boolean {
    return this.value === other.value;
  }
}