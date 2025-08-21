import { MongoClient, Db, Collection } from "mongodb";

export class MongoConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private readonly connectionString: string;
  private readonly databaseName: string;

  constructor() {
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.databaseName = process.env.MONGODB_DATABASE || 'streams-poc';
  }

  public async connect(): Promise<void> {
    if (this.client && this.db) {
      return;
    }

    try {
      this.client = new MongoClient(this.connectionString);
      await this.client.connect();
      this.db = this.client.db(this.databaseName);
      
      await this.db.admin().ping();
      this.setupEventHandlers();
    } catch (error) {
      throw new Error(`Failed to connect to MongoDB: ${error}`);
    }
  }

  public isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    process.on("SIGINT", async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  public getCollection<T extends Record<string, any> = any>(name: string): Collection<T> {
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
