export interface ProcessingMetadata {
  readonly processedValue: number;
  readonly squared: number;
  readonly sqrt: number;
  readonly heavyData?: any[];
}

export class ProcessedDocument {
  constructor(
    private readonly metadata: ProcessingMetadata,
    private readonly processedAt: Date
  ) {}

  getMetadata(): ProcessingMetadata {
    return this.metadata;
  }

  getProcessedAt(): Date {
    return this.processedAt;
  }
}