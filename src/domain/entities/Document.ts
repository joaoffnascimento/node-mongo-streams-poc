export interface IDocumentMetadata {
  source: string;
  version: string;
  processed: boolean;
  tags: string[];
  description: string;
  nested: {
    level1: {
      level2: {
        level3: {
          value: number;
        };
      };
    };
  };
  processedValue?: number;
  squared?: number;
  sqrt?: number;
  heavyData?: any[]; // Allow heavy data for processing demos
  [key: string]: any; // Allow additional properties
}

export interface IDocumentData {
  id: number;
  timestamp: Date;
  value: number;
  category: string;
  metadata: IDocumentMetadata;
  processed?: boolean;
  processedAt?: Date | null;
}

export class Document {
  public readonly id: number;
  public readonly timestamp: Date;
  public readonly value: number;
  public readonly category: string;
  public readonly metadata: IDocumentMetadata;
  public readonly processed: boolean;
  public readonly processedAt: Date | null;

  constructor(data: IDocumentData) {
    this.id = data.id;
    this.timestamp = data.timestamp;
    this.value = data.value;
    this.category = data.category;
    this.metadata = data.metadata;
    this.processed = data.processed || false;
    this.processedAt = data.processedAt || null;
  }

  public process(): Document {
    return new Document({
      ...this,
      processed: true,
      processedAt: new Date(),
      metadata: {
        ...this.metadata,
        processedValue: this.value * 2,
        squared: this.value ** 2,
        sqrt: Math.sqrt(this.value),
      },
    });
  }

  public toJSON(): IDocumentData {
    return {
      id: this.id,
      timestamp: this.timestamp,
      value: this.value,
      category: this.category,
      metadata: this.metadata,
      processed: this.processed,
      processedAt: this.processedAt,
    };
  }
}

export default Document;
