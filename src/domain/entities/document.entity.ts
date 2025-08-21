import { DocumentId } from '../value-objects/document-id.value-object';
import { DocumentValue } from '../value-objects/document-value.value-object';
import { ProcessingMetadata } from '../value-objects/processing-metadata.value-object';

export interface DocumentMetadata {
  source: string;
  version: string;
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
  [key: string]: unknown;
}

export interface DocumentData {
  id: number;
  timestamp: Date;
  value: number;
  category: string;
  metadata: DocumentMetadata;
  processed?: boolean;
  processedAt?: Date | null;
  [key: string]: unknown;
}

export class Document {
  private readonly _id: DocumentId;
  private readonly _timestamp: Date;
  private readonly _value: DocumentValue;
  private readonly _category: string;
  private readonly _metadata: DocumentMetadata;
  private readonly _processed: boolean;
  private readonly _processedAt: Date | null;

  constructor(data: DocumentData) {
    this._id = new DocumentId(data.id);
    this._timestamp = data.timestamp;
    this._value = new DocumentValue(data.value);
    this._category = data.category;
    this._metadata = data.metadata;
    this._processed = data.processed || false;
    this._processedAt = data.processedAt || null;
  }

  get id(): DocumentId {
    return this._id;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get value(): DocumentValue {
    return this._value;
  }

  get category(): string {
    return this._category;
  }

  get metadata(): DocumentMetadata {
    return this._metadata;
  }

  get processed(): boolean {
    return this._processed;
  }

  get processedAt(): Date | null {
    return this._processedAt;
  }

  public process(): Document {
    const processingMetadata: ProcessingMetadata = {
      processedValue: this._value.multiply(2).getValue(),
      squared: this._value.square().getValue(),
      sqrt: this._value.sqrt().getValue(),
    };

    return new Document({
      id: this._id.getValue(),
      timestamp: this._timestamp,
      value: this._value.getValue(),
      category: this._category,
      metadata: {
        ...this._metadata,
        ...processingMetadata,
      },
      processed: true,
      processedAt: new Date(),
    });
  }

  public toJSON(): DocumentData {
    return {
      id: this._id.getValue(),
      timestamp: this._timestamp,
      value: this._value.getValue(),
      category: this._category,
      metadata: this._metadata,
      processed: this._processed,
      processedAt: this._processedAt,
    };
  }
}

export default Document;
