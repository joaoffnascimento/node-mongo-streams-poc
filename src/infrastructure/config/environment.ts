import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../../.env") });

export interface IMongoDBConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    minPoolSize: number;
    maxIdleTimeMS: number;
    serverSelectionTimeoutMS: number;
  };
}

export interface IBatchConfig {
  size: number;
  parallelism: number;
}

export interface IMonitoringConfig {
  interval: number;
  enabled: boolean;
}

export interface ISeedConfig {
  totalDocuments: number;
  batchSize: number;
}

export interface IConfig {
  mongodb: IMongoDBConfig;
  batch: IBatchConfig;
  monitoring: IMonitoringConfig;
  seed: ISeedConfig;
}

const config: IConfig = {
  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      "mongodb://app_user:app_password@localhost:27017/streams_poc",
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 5000,
    },
  },
  batch: {
    size: parseInt(process.env.BATCH_SIZE || "1000", 10),
    parallelism: parseInt(process.env.PARALLELISM || "1", 10),
  },
  monitoring: {
    interval: parseInt(process.env.MONITORING_INTERVAL || "5000", 10),
    enabled: process.env.MONITORING_ENABLED !== "false",
  },
  seed: {
    totalDocuments: parseInt(process.env.TOTAL_DOCUMENTS || "1000000", 10),
    batchSize: parseInt(process.env.SEED_BATCH_SIZE || "5000", 10),
  },
};

export default config;
