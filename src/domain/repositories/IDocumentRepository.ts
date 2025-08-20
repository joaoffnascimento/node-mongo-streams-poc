import { Readable, Writable } from "stream";
import { Document, IDocumentData } from "@domain/entities/Document";

export interface IFindAllOptions {
  limit?: number;
  skip?: number;
  batchSize?: number;
}

export interface IDocumentRepository {
  findAll(options?: IFindAllOptions): Promise<Document[]>;
  findAllStream(options?: IFindAllOptions): Promise<Readable>;
  count(): Promise<number>;
  insertMany(documents: IDocumentData[]): Promise<any>;
  insertStream(): Promise<Readable>;
  createInsertStream(options?: any): Writable;
  deleteAll(): Promise<any>;
}

export abstract class BaseDocumentRepository implements IDocumentRepository {
  abstract findAll(options?: IFindAllOptions): Promise<Document[]>;
  abstract findAllStream(options?: IFindAllOptions): Promise<Readable>;
  abstract count(): Promise<number>;
  abstract insertMany(documents: IDocumentData[]): Promise<any>;
  abstract insertStream(): Promise<Readable>;
  abstract createInsertStream(options?: any): Writable;
  abstract deleteAll(): Promise<any>;
}

export default IDocumentRepository;
