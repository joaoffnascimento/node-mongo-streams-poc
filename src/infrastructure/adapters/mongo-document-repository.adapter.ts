import { DocumentRepository, FindAllOptions, StreamOptions, DeleteResult, InsertStreamOptions } from '../../domain/ports/document-repository.port';
import { Document, DocumentData } from '../../domain/entities/document.entity';
import { MongoConnection } from '../database/mongo-connection.database';
import { Collection, FindOptions } from 'mongodb';
import { Readable, Writable } from 'stream';

export class MongoDocumentRepositoryAdapter implements DocumentRepository {
  private readonly collectionName: string = 'documents';

  constructor(private readonly mongoConnection: MongoConnection) {}

  private async getCollection(): Promise<Collection<DocumentData>> {
    await this.mongoConnection.connect();
    return this.mongoConnection.getCollection<DocumentData>(this.collectionName);
  }

  public async findAll(options: FindAllOptions = {}): Promise<Document[]> {
    const collection = await this.getCollection();

    const findOptions: FindOptions = {};
    if (options.limit) findOptions.limit = options.limit;
    if (options.skip) findOptions.skip = options.skip;
    if (options.batchSize) findOptions.batchSize = options.batchSize;

    const documents = await collection.find({}, findOptions).toArray();

    return documents.map(doc => new Document(doc));
  }

  public async findAllStream(options: StreamOptions = {}): Promise<Readable> {
    const collection = await this.getCollection();

    const findOptions: FindOptions = {
      batchSize: options.batchSize || 1000,
    };

    if (options.limit) findOptions.limit = options.limit;

    const cursor = collection.find(options.filter || {}, findOptions);
    return cursor.stream();
  }

  public async count(filter: Record<string, any> = {}): Promise<number> {
    const collection = await this.getCollection();
    return await collection.countDocuments(filter);
  }

  public async deleteAll(): Promise<DeleteResult> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({});
    return {
      deletedCount: result.deletedCount,
    };
  }

  public createInsertStream(options: InsertStreamOptions = {}): Writable {
    const batchSize = options.batchSize || 5000;
    let batch: DocumentData[] = [];
    const getCollection = this.getCollection.bind(this);

    return new Writable({
      objectMode: true,
      async write(document: Document, _encoding, callback) {
        try {
          batch.push(document.toData());

          if (batch.length >= batchSize) {
            const collection = await getCollection();
            await collection.insertMany(batch);
            batch = [];
          }

          callback();
        } catch (error) {
          callback(error);
        }
      },
      async final(callback) {
        try {
          if (batch.length > 0) {
            const collection = await getCollection();
            await collection.insertMany(batch);
          }
          callback();
        } catch (error) {
          callback(error);
        }
      }
    });
  }
}