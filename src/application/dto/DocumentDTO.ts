import { Document, IDocumentMetadata } from "@domain/entities/Document";

export interface IDocumentDTOData {
  id: number;
  timestamp: Date;
  value: number;
  category: string;
  metadata: IDocumentMetadata;
  processed?: boolean;
  processedAt?: Date | null;
}

export class DocumentDTO {
  public readonly id: number;
  public readonly timestamp: Date;
  public readonly value: number;
  public readonly category: string;
  public readonly metadata: IDocumentMetadata;
  public readonly processed: boolean;
  public readonly processedAt: Date | null;

  constructor(data: IDocumentDTOData) {
    this.id = data.id;
    this.timestamp = data.timestamp;
    this.value = data.value;
    this.category = data.category;
    this.metadata = data.metadata;
    this.processed = data.processed || false;
    this.processedAt = data.processedAt || null;
  }

  public static fromDomain(document: Document): DocumentDTO {
    return new DocumentDTO({
      id: document.id,
      timestamp: document.timestamp,
      value: document.value,
      category: document.category,
      metadata: document.metadata,
      processed: document.processed,
      processedAt: document.processedAt,
    });
  }

  public toDomain(): Document {
    return new Document({
      id: this.id,
      timestamp: this.timestamp,
      value: this.value,
      category: this.category,
      metadata: this.metadata,
      processed: this.processed,
      processedAt: this.processedAt,
    });
  }

  public toJSON(): IDocumentDTOData {
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

  public static fromJSON(json: IDocumentDTOData): DocumentDTO {
    return new DocumentDTO({
      ...json,
      timestamp: new Date(json.timestamp),
      processedAt: json.processedAt ? new Date(json.processedAt) : null,
    });
  }
}

export default DocumentDTO;
