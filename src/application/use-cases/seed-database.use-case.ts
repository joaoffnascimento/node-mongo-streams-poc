import { Readable, Transform, pipeline } from "stream";
import { promisify } from "util";
import { Document } from "../../domain/entities/document.entity";
import { DocumentRepository } from "../../domain/ports/document-repository.port";
import { Logger } from "../../domain/ports/logger.port";
import { PerformanceMonitor } from "../../domain/ports/performance-monitor.port";

const pipelineAsync = promisify(pipeline);

interface SeedDatabaseRequest {
  totalDocuments?: number;
  batchSize?: number;
}

interface SeedDatabaseResult {
  success: boolean;
  totalSeeded: number;
  totalTime: number;
  documentsPerSecond: number;
  message: string;
}

class DocumentGenerator extends Readable {
  private current = 0;
  private total: number;
  private categories = ["A", "B", "C", "D"];

  constructor(options: { total?: number } = {}) {
    super({ objectMode: true });
    this.total = options.total || parseInt(process.env.TOTAL_DOCUMENTS || '1000000');
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
  private logger: Logger;

  constructor(options: { total?: number; logger: Logger } = {} as any) {
    super({ objectMode: true });
    this.total = options.total || parseInt(process.env.TOTAL_DOCUMENTS || '1000000');
    this.logger = options.logger;
  }

  _transform(document: any, _encoding: BufferEncoding, callback: Function) {
    this.processed++;

    if (this.processed % 10000 === 0) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const rate = Math.round(this.processed / elapsed);
      const progress = ((this.processed / this.total) * 100).toFixed(1);
      const eta = Math.round((this.total - this.processed) / rate);

      this.logger.info(`Seeding progress: ${this.processed.toLocaleString()}/${this.total.toLocaleString()} (${progress}%) | ${rate} docs/sec | ETA: ${eta}s`);
    }

    callback(null, document);
  }

  _final(callback: Function) {
    this.logger.info(`Seeded ${this.processed.toLocaleString()} documents successfully!`);
    callback();
  }
}

export class SeedDatabaseUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly performanceMonitor: PerformanceMonitor,
    private readonly logger: Logger
  ) {}

  async execute(request: SeedDatabaseRequest = {}): Promise<SeedDatabaseResult> {
    const totalDocuments = request.totalDocuments || parseInt(process.env.TOTAL_DOCUMENTS || '1000000');
    const batchSize = request.batchSize || parseInt(process.env.SEED_BATCH_SIZE || '5000');

    this.logger.info('Starting database seeding', {
      totalDocuments: totalDocuments.toLocaleString(),
      batchSize: batchSize.toLocaleString()
    });

    const monitor = this.performanceMonitor;
    monitor.start();

    try {
      // Clear existing data
      this.logger.info('Clearing existing data...');
      await this.documentRepository.deleteAll();

      // Create streams
      const generator = new DocumentGenerator({ total: totalDocuments });
      const progress = new ProgressTransform({ total: totalDocuments, logger: this.logger });
      const writer = this.documentRepository.createInsertStream({ batchSize });

      // Run pipeline
      await pipelineAsync(generator, progress, writer);

      // Verify count
      const count = await this.documentRepository.count();
      this.logger.info(`Verification: ${count.toLocaleString()} documents in database`);

      const metrics = monitor.getMetrics();
      const documentsPerSecond = Math.round(totalDocuments / (metrics.totalTime / 1000));

      return {
        success: true,
        totalSeeded: count,
        totalTime: metrics.totalTime,
        documentsPerSecond,
        message: `Successfully seeded ${count.toLocaleString()} documents`
      };
    } catch (error) {
      this.logger.error('Seeding failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}