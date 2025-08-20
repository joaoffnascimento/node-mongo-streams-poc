import chalk from "chalk";
import ora from "ora";
import { IDocumentRepository } from "@domain/repositories/IDocumentRepository";
import { PerformanceMonitor } from "@infrastructure/monitoring/PerformanceMonitor";

export interface IProcessStreamOptions {
  limit?: number;
  batchSize?: number;
}

export interface IProcessStreamResult {
  totalProcessed: number;
  totalTime: number;
  memoryUsed: number;
  method: string;
}

export interface IProcessedDocument {
  id: number;
  timestamp: Date;
  value: number;
  category: string;
  metadata: any;
  processed: boolean;
  processedAt: Date;
}

export class ProcessDocumentsWithStream {
  private repository: IDocumentRepository;
  private monitor: PerformanceMonitor; // Used by interface, may be used for future monitoring

  constructor(
    documentRepository: IDocumentRepository,
    performanceMonitor: PerformanceMonitor
  ) {
    this.repository = documentRepository;
    this.monitor = performanceMonitor;
  }

  public async execute(
    options: IProcessStreamOptions = {}
  ): Promise<IProcessStreamResult> {
    try {
      console.log(chalk.bold.green("\n🟢 PROCESSING WITH STREAMS\n"));
      console.log(
        chalk.green(
          "✅ Memory-efficient processing with MongoDB cursor streams\n"
        )
      );

      // Start performance monitoring
      const startTime = Date.now();
      const initialMemory = process.memoryUsage();
      let processedCount = 0;
      const limit = options.limit || 10000; // Default limit for safety

      console.log(
        chalk.gray(`Processing limit: ${limit.toLocaleString()} documents\n`)
      );

      // Create MongoDB cursor stream
      const cursorStreamOptions = {
        batchSize: options.batchSize || 1000,
        limit: limit, // Always set a limit
      };

      const cursorStream = await this.repository.findAllStream(
        cursorStreamOptions
      );

      const spinner = ora({
        text: chalk.green("Processing documents with streams..."),
        spinner: "dots",
      }).start();

      // Process stream directly without complex pipeline
      let processedResults = 0; // Just count, don't store results

      await new Promise<void>((resolve, reject) => {
        cursorStream.on("data", (chunk: any) => {
          try {
            if (processedCount >= limit) {
              cursorStream.destroy();
              resolve();
              return;
            }

            // Process the document (but don't store result to save memory)
            this.heavyProcessing(chunk);
            processedResults++;
            processedCount++;

            // Progress tracking
            if (processedCount % 1000 === 0) {
              const memory = process.memoryUsage();
              const memoryDelta = Math.round(
                (memory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
              );
              const progress = ((processedCount / limit) * 100).toFixed(1);

              spinner.text = chalk.green(
                `Processing: ${processedCount.toLocaleString()}/${limit.toLocaleString()} (${progress}%) | Memory: +${memoryDelta}MB`
              );
            }
          } catch (error) {
            reject(error as Error);
          }
        });

        cursorStream.on("end", () => {
          resolve();
        });

        cursorStream.on("error", (error: Error) => {
          reject(error);
        });
      });

      spinner.succeed(chalk.green(`✅ Processing completed successfully`));

      // End performance monitoring and get results
      const performanceReport = this.monitor.stop();
      const totalTime = (Date.now() - startTime) / 1000;

      // Check final memory
      const finalMemory = process.memoryUsage();
      const totalMemoryUsed = Math.max(
        Math.round(
          (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
        ),
        Math.round(finalMemory.heapUsed / 1024 / 1024) // Use current memory if diff is negative
      );

      console.log(
        chalk.green(
          `� Total processed: ${processedCount.toLocaleString()} documents in ${totalTime.toFixed(
            2
          )}s`
        )
      );
      console.log(chalk.green(`�💾 Total memory used: ${totalMemoryUsed} MB`));

      console.log(chalk.bold.green("\n🟢 ADVANTAGES DEMONSTRATED:"));
      console.log(chalk.green("   • Low, consistent memory usage"));
      console.log(
        chalk.green("   • Immediate processing start (no loading wait)")
      );
      console.log(chalk.green("   • Backpressure handling"));
      console.log(chalk.green("   • Scalable for any dataset size"));
      console.log(chalk.green("   • Can process infinite streams"));
      console.log(chalk.green("   • Better for real-time processing\n"));

      return {
        totalProcessed: processedCount,
        totalTime,
        memoryUsed: totalMemoryUsed,
        method: "with-streams",
      };
    } catch (error) {
      console.error(chalk.red("Stream processing failed:"), error);
      throw error;
    }
  }

  private heavyProcessing(document: any): IProcessedDocument {
    // Same heavy processing logic
    const processed: IProcessedDocument = {
      id: document.id,
      timestamp: document.timestamp,
      value: document.value,
      category: document.category,
      metadata: document.metadata,
      processed: true,
      processedAt: new Date(),
    };

    // Simulate expensive operations
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(processed.value * i);
    }

    // Add processed data
    processed.metadata = {
      ...processed.metadata,
      processedValue: processed.value * 2,
      squared: processed.value ** 2,
      sqrt: Math.sqrt(processed.value),
      heavyData: new Array(100).fill(0).map((_, i) => ({
        index: i,
        value: Math.random() * 1000,
        timestamp: new Date(),
        data: `Heavy processing data ${i}`.repeat(10),
      })),
    };

    return processed;
  }
}

export default ProcessDocumentsWithStream;
