const dotenv = require("dotenv");
const path = require("path");

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(__dirname, "../../../.env") });

const config = {
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
    size: parseInt(process.env.BATCH_SIZE) || 1000,
    parallelism: parseInt(process.env.PARALLELISM) || 1,
  },
  monitoring: {
    interval: parseInt(process.env.MONITORING_INTERVAL) || 5000,
    enabled: process.env.MONITORING_ENABLED !== "false",
  },
  seed: {
    totalDocuments: parseInt(process.env.TOTAL_DOCUMENTS) || 1000000,
    batchSize: parseInt(process.env.SEED_BATCH_SIZE) || 5000,
  },
};

module.exports = config;
