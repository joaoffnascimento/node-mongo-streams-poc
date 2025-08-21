import {
  DocumentRepository,
  FindAllOptions,
  StreamOptions,
  DeleteResult,
  InsertStreamOptions,
} from '../../domain/ports/document-repository.port';
import { Document, DocumentData } from '../../domain/entities/document.entity';
import { MongoConnection } from '../database/mongo-connection.database';
import { Collection, FindOptions } from 'mongodb';
import { Readable, Writable } from 'stream';
import { MetricsAdapter } from './metrics.adapter';

export class MongoDocumentRepositoryAdapter implements DocumentRepository {
  private readonly collectionName: string = 'documents';
  private readonly metricsAdapter: MetricsAdapter;

  constructor(private readonly mongoConnection: MongoConnection) {
    this.metricsAdapter = MetricsAdapter.getInstance();
  }

  private async getCollection(): Promise<Collection<DocumentData>> {
    await this.mongoConnection.connect();
    return this.mongoConnection.getCollection<DocumentData>(
      this.collectionName
    );
  }

  public async findAll(options: FindAllOptions = {}): Promise<Document[]> {
    const startTime = Date.now();
    
    try {
      const collection = await this.getCollection();

      const findOptions: FindOptions = {};
      if (options.limit) findOptions.limit = options.limit;
      if (options.skip) findOptions.skip = options.skip;
      if (options.batchSize) findOptions.batchSize = options.batchSize;

      const documents = await collection.find({}, findOptions).toArray();

      const duration = Date.now() - startTime;
      this.metricsAdapter.recordMongoOperation('findAll', this.collectionName, duration);

      return documents.map(doc => new Document(doc));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsAdapter.recordMongoOperation('findAll_error', this.collectionName, duration);
      throw error;
    }
  }

  public async findAllStream(options: StreamOptions = {}): Promise<Readable> {
    const startTime = Date.now();
    
    try {
      const collection = await this.getCollection();

      const findOptions: FindOptions = {
        batchSize: options.batchSize || 1000,
      };

      if (options.limit) findOptions.limit = options.limit;

      const cursor = collection.find(options.filter || {}, findOptions);
      const stream = cursor.stream();

      this.metricsAdapter.recordMongoOperation('findAllStream', this.collectionName, Date.now() - startTime);
      
      return stream;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsAdapter.recordMongoOperation('findAllStream_error', this.collectionName, duration);
      throw error;
    }
  }

  public async count(filter: Record<string, unknown> = {}): Promise<number> {
    const startTime = Date.now();
    
    try {
      const collection = await this.getCollection();
      const result = await collection.countDocuments(filter);

      const duration = Date.now() - startTime;
      this.metricsAdapter.recordMongoOperation('count', this.collectionName, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsAdapter.recordMongoOperation('count_error', this.collectionName, duration);
      throw error;
    }
  }

  public async deleteAll(): Promise<DeleteResult> {
    const startTime = Date.now();
    
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteMany({});

      const duration = Date.now() - startTime;
      this.metricsAdapter.recordMongoOperation('deleteAll', this.collectionName, duration);

      return {
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsAdapter.recordMongoOperation('deleteAll_error', this.collectionName, duration);
      throw error;
    }
  }

  public createInsertStream(options: InsertStreamOptions = {}): Writable {
    const batchSize = options.batchSize || 5000;
    let batch: DocumentData[] = [];
    const getCollection = this.getCollection.bind(this);
    const metricsAdapter = this.metricsAdapter;
    const collectionName = this.collectionName;

    return new Writable({
      objectMode: true,
      async write(document: Document, _encoding, callback) {
        try {
          batch.push(document.toJSON());

          if (batch.length >= batchSize) {
            const startTime = Date.now();
            try {
              const collection = await getCollection();
              await collection.insertMany(batch);
              const duration = Date.now() - startTime;
              metricsAdapter.recordMongoOperation('insertMany', collectionName, duration);
              batch = [];
            } catch (error) {
              const duration = Date.now() - startTime;
              metricsAdapter.recordMongoOperation('insertMany_error', collectionName, duration);
              throw error;
            }
          }

          callback();
        } catch (error) {
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      },
      async final(callback) {
        try {
          if (batch.length > 0) {
            const startTime = Date.now();
            try {
              const collection = await getCollection();
              await collection.insertMany(batch);
              const duration = Date.now() - startTime;
              metricsAdapter.recordMongoOperation('insertMany_final', collectionName, duration);
            } catch (error) {
              const duration = Date.now() - startTime;
              metricsAdapter.recordMongoOperation('insertMany_final_error', collectionName, duration);
              throw error;
            }
          }
          callback();
        } catch (error) {
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      },
    });
  }
}
