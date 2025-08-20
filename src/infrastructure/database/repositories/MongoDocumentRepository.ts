import {
  BaseDocumentRepository,
  IFindAllOptions,
} from "@domain/repositories/IDocumentRepository";
import { Document, IDocumentData } from "@domain/entities/Document";
import mongoConnection from "@infrastructure/database/MongoConnection";
import { Readable, Writable } from "stream";
import logger from "@infrastructure/monitoring/logger";
import {
  Collection,
  DeleteResult,
  InsertManyResult,
  FindOptions,
} from "mongodb";

export interface IMongoFindOptions extends IFindAllOptions {
  filter?: Record<string, any>;
  projection?: Record<string, any>;
  sort?: Record<string, any>;
}

export interface IInsertStreamOptions {
  batchSize?: number;
  ordered?: boolean;
}

export class MongoDocumentRepository extends BaseDocumentRepository {
  private readonly collectionName: string = "documents";

  private async getCollection(): Promise<Collection<IDocumentData>> {
    await mongoConnection.connect();
    return mongoConnection.getCollection<IDocumentData>(this.collectionName);
  }

  public async findAll(options: IFindAllOptions = {}): Promise<Document[]> {
    try {
      const collection = await this.getCollection();

      const findOptions: FindOptions = {};
      if (options.limit) {
        findOptions.limit = options.limit;
      }
      if (options.skip) {
        findOptions.skip = options.skip;
      }
      if (options.batchSize) {
        findOptions.batchSize = options.batchSize;
      }

      const documents = await collection.find({}, findOptions).toArray();

      return documents.map(
        (doc) =>
          new Document({
            id: doc.id,
            timestamp: doc.timestamp,
            value: doc.value,
            category: doc.category,
            metadata: doc.metadata,
            processed: doc.processed,
            processedAt: doc.processedAt,
          })
      );
    } catch (error) {
      logger.error("Error finding all documents:", error);
      throw error;
    }
  }

  public async findAllStream(
    options: IMongoFindOptions = {}
  ): Promise<Readable> {
    const collection = await this.getCollection();

    const findOptions: FindOptions = {
      batchSize: options.batchSize || 1000,
    };

    // Add limit if specified
    if (options.limit) {
      findOptions.limit = options.limit;
    }

    // Add other options
    if (options.projection) {
      findOptions.projection = options.projection;
    }
    if (options.sort) {
      findOptions.sort = options.sort;
    }

    const cursor = collection.find(options.filter || {}, findOptions);

    // Return cursor as stream
    return cursor.stream();
  }

  public async count(filter: Record<string, any> = {}): Promise<number> {
    const collection = await this.getCollection();
    return await collection.countDocuments(filter);
  }

  public async insertMany(
    documents: (Document | IDocumentData)[],
    options: IInsertStreamOptions = {}
  ): Promise<InsertManyResult<IDocumentData>> {
    try {
      const collection = await this.getCollection();
      const docs = documents.map((doc) =>
        doc instanceof Document ? doc.toJSON() : doc
      );

      const result = await collection.insertMany(docs, {
        ordered: false,
        ...options,
      });

      return result;
    } catch (error: any) {
      if (error.code === 11000) {
        logger.warn("Duplicate key error, continuing...");
        return {
          insertedCount: 0,
          insertedIds: {},
          acknowledged: true,
        };
      }
      throw error;
    }
  }

  public createInsertStream(options: IInsertStreamOptions = {}): Writable {
    const batchSize = options.batchSize || 1000;
    let batch: (Document | IDocumentData)[] = [];
    let totalInserted = 0;

    return new Writable({
      objectMode: true,
      highWaterMark: batchSize,

      write: async (
        document: Document | IDocumentData,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void
      ) => {
        try {
          batch.push(document);

          if (batch.length >= batchSize) {
            const result = await this.insertMany(batch, options);
            totalInserted += result.insertedCount;
            batch = [];

            if (totalInserted % 10000 === 0) {
              logger.info(`Inserted ${totalInserted} documents`);
            }
          }

          callback();
        } catch (error) {
          callback(error as Error);
        }
      },

      final: async (callback: (error?: Error | null) => void) => {
        try {
          if (batch.length > 0) {
            const result = await this.insertMany(batch, options);
            totalInserted += result.insertedCount;
          }
          logger.info(`Total inserted: ${totalInserted} documents`);
          callback();
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  }

  public async insertStream(): Promise<Readable> {
    // This method returns a writable stream for inserting documents
    // Converting to Readable for interface compatibility
    const writable = this.createInsertStream();
    return writable as any; // Type assertion for interface compatibility
  }

  public async deleteAll(): Promise<DeleteResult> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({});
    logger.info(`Deleted ${result.deletedCount} documents`);
    return result;
  }
}

export default MongoDocumentRepository;
