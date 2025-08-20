const IDocumentRepository = require("../../../domain/repositories/IDocumentRepository");
const Document = require("../../../domain/entities/Document");
const mongoConnection = require("../MongoConnection");
const { Readable, Writable, Transform } = require("stream");
const logger = require("../../monitoring/logger");

class MongoDocumentRepository extends IDocumentRepository {
  constructor() {
    super();
    this.collectionName = "documents";
  }

  async getCollection() {
    await mongoConnection.connect();
    return mongoConnection.getCollection(this.collectionName);
  }

  async findAll() {
    try {
      const collection = await this.getCollection();
      const documents = await collection.find({}).toArray();

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

  async findAllStream(options = {}) {
    const collection = await this.getCollection();

    const findOptions = {
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

    // Retorna o cursor como stream
    return cursor.stream();
  }

  async count(filter = {}) {
    const collection = await this.getCollection();
    return await collection.countDocuments(filter);
  }

  async insertMany(documents, options = {}) {
    try {
      const collection = await this.getCollection();
      const docs = documents.map((doc) => (doc.toJSON ? doc.toJSON() : doc));

      const result = await collection.insertMany(docs, {
        ordered: false,
        ...options,
      });

      return result;
    } catch (error) {
      if (error.code === 11000) {
        logger.warn("Duplicate key error, continuing...");
        return { insertedCount: 0 };
      }
      throw error;
    }
  }

  createInsertStream(options = {}) {
    const batchSize = options.batchSize || 1000;
    let batch = [];
    let totalInserted = 0;
    const self = this;

    return new Writable({
      objectMode: true,
      highWaterMark: batchSize,

      async write(document, encoding, callback) {
        try {
          batch.push(document);

          if (batch.length >= batchSize) {
            const result = await self.insertMany(batch, options);
            totalInserted += result.insertedCount;
            batch = [];

            if (totalInserted % 10000 === 0) {
              logger.info(`Inserted ${totalInserted} documents`);
            }
          }

          callback();
        } catch (error) {
          callback(error);
        }
      },

      async final(callback) {
        try {
          if (batch.length > 0) {
            const result = await self.insertMany(batch, options);
            totalInserted += result.insertedCount;
          }
          logger.info(`Total inserted: ${totalInserted} documents`);
          callback();
        } catch (error) {
          callback(error);
        }
      },
    });
  }

  async deleteAll() {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({});
    logger.info(`Deleted ${result.deletedCount} documents`);
    return result;
  }
}

module.exports = MongoDocumentRepository;
