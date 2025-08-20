# POC Completa: Node.js Streams + MongoDB com Clean Architecture

## 📋 Índice

1. [Configuração do Ambiente](#1-configuracao-ambiente)
2. [Arquitetura do Projeto](#2-arquitetura-projeto)
3. [Setup MongoDB com Limitações](#3-setup-mongodb)
4. [Implementação Clean Architecture](#4-implementacao-clean)
5. [Seed de Dados (1M+ documentos)](#5-seed-dados)
6. [Implementação SEM Streams](#6-sem-streams)
7. [Implementação COM Streams](#7-com-streams)
8. [Monitoramento e Métricas](#8-monitoramento)
9. [Executando os Testes](#9-executando-testes)
10. [Análise dos Resultados](#10-analise-resultados)

---

## 1. Configuração do Ambiente {#1-configuracao-ambiente}

### Estrutura de Pastas (Clean Architecture)

```bash
mongodb-streams-poc/
├── docker/
│   ├── docker-compose.yml
│   └── mongo-init.js
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Document.js
│   │   ├── repositories/
│   │   │   └── IDocumentRepository.js
│   │   └── use-cases/
│   │       ├── ProcessDocumentsWithStream.js
│   │       └── ProcessDocumentsWithoutStream.js
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── MongoConnection.js
│   │   │   └── repositories/
│   │   │       └── MongoDocumentRepository.js
│   │   ├── monitoring/
│   │   │   ├── PerformanceMonitor.js
│   │   │   └── MemoryTracker.js
│   │   └── config/
│   │       └── environment.js
│   ├── application/
│   │   ├── services/
│   │   │   ├── DocumentService.js
│   │   │   └── StreamService.js
│   │   └── dto/
│   │       └── DocumentDTO.js
│   └── presentation/
│       ├── cli/
│       │   ├── commands/
│       │   │   ├── SeedCommand.js
│       │   │   ├── ProcessWithStreamCommand.js
│       │   │   └── ProcessWithoutStreamCommand.js
│       │   └── index.js
│       └── api/
│           └── routes.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── performance/
│       └── benchmark.js
├── scripts/
│   ├── seed.js
│   ├── benchmark.js
│   └── compare-results.js
├── .env
├── .dockerignore
├── package.json
└── README.md
```

### Instalação de Dependências

```bash
# Criar o projeto
mkdir mongodb-streams-poc
cd mongodb-streams-poc
npm init -y

# Instalar dependências de produção
npm install mongodb dotenv commander chalk ora cli-table3
npm install stream-chain stream-json through2
npm install pino pino-pretty

# Instalar dependências de desenvolvimento
npm install -D nodemon jest @types/node
```

### package.json

```json
{
  "name": "mongodb-streams-poc",
  "version": "1.0.0",
  "description": "POC demonstrando processamento eficiente com Streams",
  "main": "src/presentation/cli/index.js",
  "scripts": {
    "start": "node src/presentation/cli/index.js",
    "dev": "nodemon src/presentation/cli/index.js",
    "seed": "node scripts/seed.js",
    "benchmark": "node scripts/benchmark.js",
    "test:no-stream": "node src/presentation/cli/index.js process:no-stream",
    "test:stream": "node src/presentation/cli/index.js process:stream",
    "test:compare": "node scripts/compare-results.js",
    "docker:up": "docker-compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker-compose -f docker/docker-compose.yml down",
    "docker:reset": "npm run docker:down && docker volume rm mongodb-streams-poc_mongo-data && npm run docker:up"
  },
  "keywords": ["mongodb", "streams", "clean-architecture", "performance"],
  "author": "",
  "license": "MIT"
}
```

---

## 2. Arquitetura do Projeto {#2-arquitetura-projeto}

### Domain Layer - Entidades

```javascript
// src/domain/entities/Document.js
class Document {
  constructor({
    id,
    timestamp,
    value,
    category,
    metadata,
    processed = false,
    processedAt = null,
  }) {
    this.id = id;
    this.timestamp = timestamp;
    this.value = value;
    this.category = category;
    this.metadata = metadata;
    this.processed = processed;
    this.processedAt = processedAt;
  }

  process() {
    return new Document({
      ...this,
      processed: true,
      processedAt: new Date(),
      metadata: {
        ...this.metadata,
        processedValue: this.value * 2,
        squared: this.value ** 2,
        sqrt: Math.sqrt(this.value),
      },
    });
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      value: this.value,
      category: this.category,
      metadata: this.metadata,
      processed: this.processed,
      processedAt: this.processedAt,
    };
  }
}

module.exports = Document;
```

### Domain Layer - Repository Interface

```javascript
// src/domain/repositories/IDocumentRepository.js
class IDocumentRepository {
  async findAll() {
    throw new Error("Method not implemented");
  }

  async findAllStream() {
    throw new Error("Method not implemented");
  }

  async count() {
    throw new Error("Method not implemented");
  }

  async insertMany(documents) {
    throw new Error("Method not implemented");
  }

  async insertStream() {
    throw new Error("Method not implemented");
  }

  async deleteAll() {
    throw new Error("Method not implemented");
  }
}

module.exports = IDocumentRepository;
```

---

## 3. Setup MongoDB com Limitações {#3-setup-mongodb}

### Docker Compose com Limitações

```yaml
# docker/docker-compose.yml
version: "3.8"

services:
  mongodb:
    image: mongo:6.0
    container_name: mongodb-limited
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
      MONGO_INITDB_DATABASE: streams_poc
    volumes:
      - mongo-data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    deploy:
      resources:
        limits:
          # Simula limitações do Free Tier
          memory: 512M
          cpus: "0.5"
        reservations:
          memory: 256M
    command: >
      mongod
      --wiredTigerCacheSizeGB 0.25
      --setParameter maxIncomingConnections=100
      --setParameter maxIncomingConnectionsOverride=100
      --slowms 100
      --profile 1

volumes:
  mongo-data:
    driver: local
```

### Script de Inicialização MongoDB

```javascript
// docker/mongo-init.js
// Este script roda automaticamente quando o container inicia
db = db.getSiblingDB("streams_poc");

// Criar usuário específico para a aplicação
db.createUser({
  user: "app_user",
  pwd: "app_password",
  roles: [{ role: "readWrite", db: "streams_poc" }],
});

// Criar collections com configurações otimizadas
db.createCollection("documents", {
  // Configurações para simular limitações
  capped: false,
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "timestamp", "value", "category"],
      properties: {
        id: { bsonType: "number" },
        timestamp: { bsonType: "date" },
        value: { bsonType: "number" },
        category: { enum: ["A", "B", "C", "D"] },
      },
    },
  },
});

// Criar índices para otimização
db.documents.createIndex({ id: 1 }, { unique: true });
db.documents.createIndex({ category: 1, value: -1 });
db.documents.createIndex({ processed: 1 });

print("Database initialized successfully!");
```

### Arquivo de Configuração

```javascript
// src/infrastructure/config/environment.js
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
```

### .env

```bash
# MongoDB
MONGODB_URI=mongodb://app_user:app_password@localhost:27017/streams_poc

# Processing
BATCH_SIZE=1000
PARALLELISM=1

# Monitoring
MONITORING_ENABLED=true
MONITORING_INTERVAL=5000

# Seed
TOTAL_DOCUMENTS=1000000
SEED_BATCH_SIZE=5000
```

---

## 4. Implementação Clean Architecture {#4-implementacao-clean}

### Infrastructure - Conexão MongoDB

```javascript
// src/infrastructure/database/MongoConnection.js
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
```

### Infrastructure - Repository Implementation

```javascript
// src/infrastructure/database/repositories/MongoDocumentRepository.js
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

    const cursorOptions = {
      batchSize: options.batchSize || 1000,
      ...options.cursorOptions,
    };

    const cursor = collection.find(options.filter || {}, {
      projection: options.projection,
      sort: options.sort,
      ...cursorOptions,
    });

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
```

### Infrastructure - Monitoring

```javascript
// src/infrastructure/monitoring/PerformanceMonitor.js
const { performance, PerformanceObserver } = require("perf_hooks");
const v8 = require("v8");
const os = require("os");

class PerformanceMonitor {
  constructor(name) {
    this.name = name;
    this.metrics = {
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      samples: [],
      gcEvents: [],
      eventLoopLag: [],
    };

    this.setupObservers();
    this.startMonitoring();
  }

  setupObservers() {
    // Monitor Garbage Collection
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.gcEvents.push({
          name: entry.name,
          duration: entry.duration,
          timestamp: Date.now(),
        });
      });
    });

    try {
      obs.observe({ entryTypes: ["gc"], buffered: false });
    } catch (e) {
      console.log("GC monitoring not available");
    }
  }

  startMonitoring() {
    // Monitor event loop lag
    this.lagInterval = setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        this.metrics.eventLoopLag.push({
          lag,
          timestamp: Date.now(),
        });
      });
    }, 1000);

    // Collect memory samples
    this.sampleInterval = setInterval(() => {
      this.collectSample();
    }, 5000);
  }

  collectSample() {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const sample = {
      timestamp: Date.now(),
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
        arrayBuffers: Math.round(memory.arrayBuffers / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      heap: v8.getHeapStatistics(),
      system: {
        loadavg: os.loadavg(),
        freemem: Math.round(os.freemem() / 1024 / 1024),
        totalmem: Math.round(os.totalmem() / 1024 / 1024),
      },
    };

    this.metrics.samples.push(sample);
    return sample;
  }

  stop() {
    clearInterval(this.lagInterval);
    clearInterval(this.sampleInterval);

    // Collect final metrics
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = (endTime - this.metrics.startTime) / 1000;

    const maxHeap = Math.max(
      ...this.metrics.samples.map((s) => s.memory.heapUsed)
    );
    const avgHeap = Math.round(
      this.metrics.samples.reduce((a, b) => a + b.memory.heapUsed, 0) /
        this.metrics.samples.length
    );

    const avgEventLoopLag =
      this.metrics.eventLoopLag.length > 0
        ? this.metrics.eventLoopLag.reduce((a, b) => a + b.lag, 0) /
          this.metrics.eventLoopLag.length
        : 0;

    return {
      name: this.name,
      duration,
      memory: {
        start: {
          heapUsed: Math.round(this.metrics.startMemory.heapUsed / 1024 / 1024),
          rss: Math.round(this.metrics.startMemory.rss / 1024 / 1024),
        },
        end: {
          heapUsed: Math.round(endMemory.heapUsed / 1024 / 1024),
          rss: Math.round(endMemory.rss / 1024 / 1024),
        },
        max: {
          heapUsed: maxHeap,
        },
        average: {
          heapUsed: avgHeap,
        },
      },
      gc: {
        count: this.metrics.gcEvents.length,
        totalTime: this.metrics.gcEvents.reduce((a, b) => a + b.duration, 0),
      },
      eventLoop: {
        avgLag: avgEventLoopLag.toFixed(2),
        maxLag: Math.max(
          ...this.metrics.eventLoopLag.map((e) => e.lag)
        ).toFixed(2),
      },
      samples: this.metrics.samples,
    };
  }

  printReport() {
    const report = this.stop();

    console.log("\n" + "═".repeat(60));
    console.log(`📊 PERFORMANCE REPORT: ${report.name}`);
    console.log("═".repeat(60));

    console.log("\n⏱️  Duration:", report.duration.toFixed(2), "seconds");

    console.log("\n💾 Memory Usage:");
    console.log(`   Start:   ${report.memory.start.heapUsed} MB`);
    console.log(`   End:     ${report.memory.end.heapUsed} MB`);
    console.log(`   Peak:    ${report.memory.max.heapUsed} MB`);
    console.log(`   Average: ${report.memory.average.heapUsed} MB`);
    console.log(
      `   Delta:   ${
        report.memory.end.heapUsed - report.memory.start.heapUsed
      } MB`
    );

    console.log("\n♻️  Garbage Collection:");
    console.log(`   Total GC runs: ${report.gc.count}`);
    console.log(`   Total GC time: ${report.gc.totalTime.toFixed(2)} ms`);

    console.log("\n🔄 Event Loop:");
    console.log(`   Average lag: ${report.eventLoop.avgLag} ms`);
    console.log(`   Max lag:     ${report.eventLoop.maxLag} ms`);

    console.log("\n" + "═".repeat(60));

    return report;
  }
}

module.exports = PerformanceMonitor;
```

---

## 5. Seed de Dados (1M+ documentos) {#5-seed-dados}

### Script de Seed com Streams

```javascript
// scripts/seed.js
const { Readable, Transform, pipeline } = require("stream");
const { promisify } = require("util");
const pipelineAsync = promisify(pipeline);
const MongoDocumentRepository = require("../src/infrastructure/database/repositories/MongoDocumentRepository");
const Document = require("../src/domain/entities/Document");
const PerformanceMonitor = require("../src/infrastructure/monitoring/PerformanceMonitor");
const config = require("../src/infrastructure/config/environment");
const chalk = require("chalk");
const ora = require("ora");

class DocumentGenerator extends Readable {
  constructor(options = {}) {
    super({ objectMode: true });
    this.current = 0;
    this.total = options.total || config.seed.totalDocuments;
    this.categories = ["A", "B", "C", "D"];
  }

  _read() {
    if (this.current >= this.total) {
      this.push(null);
      return;
    }

    const document = new Document({
      id: this.current,
      timestamp: new Date(),
      value: Math.random() * 1000,
      category:
        this.categories[Math.floor(Math.random() * this.categories.length)],
      metadata: {
        source: "seed-generator",
        version: "1.0.0",
        processed: false,
        tags: Array(10)
          .fill()
          .map((_, i) => `tag_${i}`),
        description:
          `Document ${this.current} - Lorem ipsum dolor sit amet, consectetur adipiscing elit. `.repeat(
            10
          ),
        nested: {
          level1: {
            level2: {
              level3: {
                value: Math.random() * 100,
              },
            },
          },
        },
      },
    });

    this.current++;
    this.push(document);
  }
}

class ProgressTransform extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.total = options.total || config.seed.totalDocuments;
    this.processed = 0;
    this.startTime = Date.now();
    this.spinner = ora({
      text: "Seeding database...",
      spinner: "dots",
    }).start();
  }

  _transform(document, encoding, callback) {
    this.processed++;

    if (this.processed % 10000 === 0) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const rate = Math.round(this.processed / elapsed);
      const progress = ((this.processed / this.total) * 100).toFixed(1);
      const eta = Math.round((this.total - this.processed) / rate);

      this.spinner.text = chalk.cyan(
        `Seeding: ${chalk.yellow(
          this.processed.toLocaleString()
        )}/${this.total.toLocaleString()} ` +
          `(${chalk.green(progress + "%")}) | ` +
          `${chalk.magenta(rate + " docs/sec")} | ` +
          `ETA: ${chalk.blue(eta + "s")}`
      );
    }

    callback(null, document);
  }

  _final(callback) {
    this.spinner.succeed(
      chalk.green(
        `✅ Seeded ${this.processed.toLocaleString()} documents successfully!`
      )
    );
    callback();
  }
}

async function seedDatabase() {
  console.log(chalk.bold.cyan("\n🌱 DATABASE SEEDING TOOL\n"));
  console.log(chalk.gray("Configuration:"));
  console.log(
    chalk.gray(
      `  • Total documents: ${config.seed.totalDocuments.toLocaleString()}`
    )
  );
  console.log(
    chalk.gray(`  • Batch size: ${config.seed.batchSize.toLocaleString()}`)
  );
  console.log(chalk.gray(`  • MongoDB URI: ${config.mongodb.uri}\n`));

  const monitor = new PerformanceMonitor("Database Seeding");
  const repository = new MongoDocumentRepository();

  try {
    // Clear existing data
    console.log(chalk.yellow("🗑️  Clearing existing data..."));
    await repository.deleteAll();

    // Create streams
    const generator = new DocumentGenerator({
      total: config.seed.totalDocuments,
    });

    const progress = new ProgressTransform({
      total: config.seed.totalDocuments,
    });

    const writer = repository.createInsertStream({
      batchSize: config.seed.batchSize,
    });

    // Run pipeline
    await pipelineAsync(generator, progress, writer);

    // Verify count
    const count = await repository.count();
    console.log(
      chalk.green(
        `\n✅ Verification: ${count.toLocaleString()} documents in database`
      )
    );

    // Print performance report
    monitor.printReport();
  } catch (error) {
    console.error(chalk.red("\n❌ Seeding failed:"), error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
```

---

## 6. Implementação SEM Streams {#6-sem-streams}

### Use Case - Processamento Tradicional

```javascript
// src/domain/use-cases/ProcessDocumentsWithoutStream.js
const chalk = require('chalk');
const ora = require('ora');

class ProcessDocumentsWithoutStream {
  constructor(documentRepository, performanceMonitor) {
    this.repository = documentRepository;
    this.monitor = performanceMonitor;
  }

  async execute(options = {}) {
    const spinner = ora({
      text: 'Loading all documents into memory...',
      spinner: 'dots'
    }).start();

    try {
      console.log(chalk.bold.red('\n🔴 PROCESSING WITHOUT STREAMS\n'));
      console.log(chalk.yellow('⚠️  WARNING: This will load ALL documents into memory!\n'));

      // Monitor inicial
      const initialMemory = process.memoryUsage();
      console.log(chalk.gray(`Initial memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)} MB`));

      // PROBLEMA: Carrega TODOS os documentos na memória
      spinner.text = 'Loading all documents into memory...';
      const startLoad = Date.now();

      const allDocuments = await this.repository.findAll();

      const loadTime = (Date.now() - startLoad) / 1000;
      spinner.succeed(chalk.red(`Loaded ${allDocuments.length.toLocaleString()} documents in ${loadTime.toFixed(2)}s`));

      // Verificar memória após carregamento
      const afterLoadMemory = process.memoryUsage();
      const memoryUsed = Math.round((afterLoadMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024);
      console.log(chalk.red(`💾 Memory spike: +${memoryUsed} MB after loading\n`));

      // Processar todos os documentos
      spinner.start('Processing documents...');
      const startProcess = Date.now();
      const processedDocuments = [];

      for (let i = 0; i < allDocuments.length; i++) {
        const doc = allDocuments[i];

        // Simula processamento pesado
        const processed = this.heavyProcessing(doc);
        process
```
