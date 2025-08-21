import { Document } from '../entities/document.entity';

export interface DocumentRepository {
  findAll(options?: FindAllOptions): Promise<Document[]>;
  findAllStream(options?: StreamOptions): Promise<NodeJS.ReadableStream>;
  count(filter?: Record<string, unknown>): Promise<number>;
  deleteAll(): Promise<DeleteResult>;
  createInsertStream(options?: InsertStreamOptions): NodeJS.WritableStream;
}

export interface FindAllOptions {
  limit?: number;
  skip?: number;
  batchSize?: number;
}

export interface StreamOptions {
  limit?: number;
  batchSize?: number;
  filter?: Record<string, unknown>;
}

export interface DeleteResult {
  deletedCount?: number;
}

export interface InsertStreamOptions {
  batchSize?: number;
}
