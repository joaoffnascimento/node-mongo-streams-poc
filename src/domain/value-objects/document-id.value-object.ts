export class DocumentId {
  constructor(private readonly value: number) {
    if (value <= 0) {
      throw new Error('Document ID must be positive');
    }
  }

  getValue(): number {
    return this.value;
  }

  equals(other: DocumentId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value.toString();
  }
}