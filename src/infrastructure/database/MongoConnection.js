const { MongoClient } = require("mongodb");
const config = require("../config/environment");
const logger = require("../monitoring/logger");

class MongoConnection {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      if (
        this.client &&
        this.client.topology &&
        this.client.topology.isConnected()
      ) {
        return this.db;
      }

      logger.info("Connecting to MongoDB...");
      this.client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.client.connect();

      this.db = this.client.db();

      // Verificar conexão
      await this.db.admin().ping();
      logger.info("Successfully connected to MongoDB");

      // Registrar event handlers
      this.setupEventHandlers();

      return this.db;
    } catch (error) {
      logger.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  setupEventHandlers() {
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

  async disconnect() {
    try {
      if (this.client) {
        logger.info("Closing MongoDB connection...");
        await this.client.close();
        logger.info("MongoDB connection closed");
      }
    } catch (error) {
      logger.error("Error closing MongoDB connection:", error);
    }
  }

  getCollection(name) {
    if (!this.db) {
      throw new Error("Database not connected");
    }
    return this.db.collection(name);
  }
}

// Singleton
module.exports = new MongoConnection();
