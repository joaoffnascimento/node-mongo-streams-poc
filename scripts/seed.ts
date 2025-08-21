import { Readable, Transform, pipeline } from "stream";
import { promisify } from "util";
import chalk from "chalk";
import ora from "ora";
import MongoDocumentRepository from "../src/infrastructure/database/repositories/MongoDocumentRepository";
import Document from "../src/domain/entities/Document";
import PerformanceMonitor from "../src/infrastructure/monitoring/PerformanceMonitor";
import mongoConnection from "../src/infrastructure/database/MongoConnection";
import config from "../src/infrastructure/config/environment";

const pipelineAsync = promisify(pipeline);

class DocumentGenerator extends Readable {
  private current = 0;
  private total: number;
  private categories = ["A", "B", "C", "D"];

  constructor(options: { total?: number } = {}) {
    super({ objectMode: true });
    this.total = options.total || config.seed.totalDocuments;
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
      category: this.categories[Math.floor(Math.random() * this.categories.length)] as "A" | "B" | "C" | "D",
      metadata: {
        source: "seed-generator",
        version: "1.0.0",
        processed: false,
        tags: Array(10)
          .fill(0)
          .map((_, i) => `tag_${i}`),
        description: `Document ${this.current} - Lorem ipsum dolor sit amet, consectetur adipiscing elit. `.repeat(10),
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
  private total: number;
  private processed = 0;
  private startTime = Date.now();
  private spinner: ora.Ora;

  constructor(options: { total?: number } = {}) {
    super({ objectMode: true });
    this.total = options.total || config.seed.totalDocuments;
    this.spinner = ora({
      text: "Seeding database...",
      spinner: "dots",
    }).start();
  }

  _transform(document: any, encoding: BufferEncoding, callback: Function) {
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

  _final(callback: Function) {
    this.spinner.succeed(
      chalk.green(
        `✅ Seeded ${this.processed.toLocaleString()} documents successfully!`
      )
    );
    callback();
  }
}

async function seedDatabase(): Promise<void> {
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
    // Close MongoDB connection to allow process to exit
    await mongoConnection.disconnect();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;