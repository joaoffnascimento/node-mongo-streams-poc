import { IDocumentRepository } from "@domain/repositories/IDocumentRepository";
import { Document } from "@domain/entities/Document";
import { Writable } from "stream";

export interface IDocumentService {
  getDocumentCount(): Promise<number>;
  processAllDocuments(): Promise<Document[]>;
  processDocumentsStream(): Promise<NodeJS.ReadableStream>;
  clearAllDocuments(): Promise<{ deletedCount?: number }>;
  seedDocuments(
    documents: any[]
  ): Promise<{ insertedCount: number; insertedIds: Record<number, any> }>;
  createDocumentInsertStream(options?: any): Writable;
}

class DocumentService implements IDocumentService {
  constructor(private repository: IDocumentRepository) {}

  async getDocumentCount(): Promise<number> {
    return await this.repository.count();
  }

  async processAllDocuments(): Promise<Document[]> {
    return await this.repository.findAll();
  }

  async processDocumentsStream(): Promise<NodeJS.ReadableStream> {
    return await this.repository.findAllStream();
  }

  async clearAllDocuments(): Promise<{ deletedCount?: number }> {
    return await this.repository.deleteAll();
  }

  async seedDocuments(
    documents: any[]
  ): Promise<{ insertedCount: number; insertedIds: Record<number, any> }> {
    return await this.repository.insertMany(documents);
  }

  createDocumentInsertStream(options?: any): Writable {
    return this.repository.createInsertStream(options);
  }
}

export default DocumentService;
