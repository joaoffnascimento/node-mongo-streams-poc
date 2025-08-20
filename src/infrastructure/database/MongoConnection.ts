import { MongoClient, Db, Collection } from "mongodb";
import config from "@infrastructure/config/environment";
import logger from "@infrastructure/monitoring/logger";

export class MongoConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  public async connect(): Promise<Db> {
    try {
      if (this.client && this.isConnected()) {
        return this.db!;
      }

      logger.info("Connecting to MongoDB...");
      this.client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.client.connect();

      this.db = this.client.db();

      // Verify connection
      await this.db.admin().ping();
      logger.info("Successfully connected to MongoDB");

      // Register event handlers
      this.setupEventHandlers();

      return this.db;
    } catch (error) {
      logger.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  private isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on("serverOpening", () =>
      logger.debug("MongoDB connection opening")
    );
    this.client.on("serverClosed", () =>
      logger.warn("MongoDB connection closed")
    );
    this.client.on("error", (err) => logger.error("MongoDB error:", err));

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        logger.info("Closing MongoDB connection...");
        await this.client.close();
        this.client = null;
        this.db = null;
        logger.info("MongoDB connection closed");
      }
    } catch (error) {
      logger.error("Error closing MongoDB connection:", error);
    }
  }

  public getCollection<T extends Record<string, any> = any>(
    name: string
  ): Collection<T> {
    if (!this.db) {
      throw new Error("Database not connected");
    }
    return this.db.collection<T>(name);
  }

  public get database(): Db {
    if (!this.db) {
      throw new Error("Database not connected");
    }
    return this.db;
  }
}

// Singleton
const mongoConnection = new MongoConnection();
export default mongoConnection;
