import chalk from "chalk";
import ora from "ora";
import { Document } from "@domain/entities/Document";
import { IDocumentRepository } from "@domain/repositories/IDocumentRepository";
import { PerformanceMonitor } from "@infrastructure/monitoring/PerformanceMonitor";

export interface IProcessNoStreamOptions {
  limit?: number;
}

export interface IProcessNoStreamResult {
  totalProcessed: number;
  loadTime: number;
  processTime: number;
  totalTime: number;
  memoryUsed: number;
  method: string;
}

export class ProcessDocumentsWithoutStream {
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
    options: IProcessNoStreamOptions = {}
  ): Promise<IProcessNoStreamResult> {
    const spinner = ora({
      text: "Loading all documents into memory...",
      spinner: "dots",
    }).start();

    try {
      console.log(chalk.bold.red("\n🔴 PROCESSING WITHOUT STREAMS\n"));
      console.log(
        chalk.yellow("⚠️  WARNING: This will load ALL documents into memory!\n")
      );

      // Initial monitoring
      const initialMemory = process.memoryUsage();
      console.log(
        chalk.gray(
          `Initial memory: ${Math.round(
            initialMemory.heapUsed / 1024 / 1024
          )} MB`
        )
      );

      // PROBLEM: Load ALL documents into memory
      spinner.text = "Loading all documents into memory...";
      const startLoad = Date.now();

      const findOptions = options.limit ? { limit: options.limit } : {};
      const allDocuments = await this.repository.findAll(findOptions);

      const loadTime = (Date.now() - startLoad) / 1000;
      spinner.succeed(
        chalk.red(
          `✔ Loaded ${allDocuments.length.toLocaleString()} documents in ${loadTime.toFixed(
            2
          )}s`
        )
      );

      // Check memory after loading
      const afterLoadMemory = process.memoryUsage();
      const memoryUsed = Math.round(
        (afterLoadMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
      );
      console.log(
        chalk.red(`💾 Memory spike: +${memoryUsed} MB after loading\n`)
      );

      // Process all documents
      spinner.start("Processing documents...");
      const startProcess = Date.now();
      const processedDocuments: Document[] = [];

      for (let i = 0; i < allDocuments.length; i++) {
        const doc = allDocuments[i];

        // Simulate heavy processing
        const processed = this.heavyProcessing(doc);
        processedDocuments.push(processed);

        // Update progress
        if (i % 10000 === 0) {
          const progress = ((i / allDocuments.length) * 100).toFixed(1);
          spinner.text = chalk.red(
            `Processing: ${i.toLocaleString()}/${allDocuments.length.toLocaleString()} (${progress}%)`
          );
        }
      }

      const processTime = (Date.now() - startProcess) / 1000;
      spinner.succeed(
        chalk.red(
          `✔ Processed ${processedDocuments.length.toLocaleString()} documents in ${processTime.toFixed(
            2
          )}s`
        )
      );

      // End performance monitoring and get results
      const performanceReport = this.monitor.stop();

      // Check final memory
      const finalMemory = process.memoryUsage();
      const totalMemoryUsed = Math.max(
        Math.round(
          (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
        ),
        Math.round(finalMemory.heapUsed / 1024 / 1024) // Use current memory if diff is negative
      );
      console.log(chalk.red(`💾 Total memory used: ${totalMemoryUsed} MB`));

      console.log(chalk.bold.red("\n🔴 PROBLEMS DEMONSTRATED:"));
      console.log(chalk.red("   • High memory consumption"));
      console.log(chalk.red("   • Slow initial load time"));
      console.log(chalk.red("   • Memory spikes and potential OOM"));
      console.log(chalk.red("   • Blocking operation (no early processing)"));
      console.log(chalk.red("   • Not scalable for large datasets\n"));

      return {
        totalProcessed: processedDocuments.length,
        loadTime,
        processTime,
        totalTime: loadTime + processTime,
        memoryUsed: totalMemoryUsed,
        method: "without-streams",
      };
    } catch (error: any) {
      spinner.fail(chalk.red("Processing failed"));

      if (
        error.message.includes("out of memory") ||
        error.code === "ERR_OUT_OF_MEMORY"
      ) {
        console.log(chalk.bold.red("\n💥 OUT OF MEMORY ERROR!"));
        console.log(
          chalk.red(
            "This demonstrates the problem with loading all data into memory."
          )
        );
        console.log(
          chalk.yellow(
            "Try reducing TOTAL_DOCUMENTS in .env or use streams instead."
          )
        );
      }

      throw error;
    }
  }

  private heavyProcessing(document: Document): Document {
    // Simulate computationally intensive processing
    const processed = document.process();

    // Simulate expensive operations
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(processed.value * i);
    }

    // Add more data to increase memory usage
    const processedDoc = new Document({
      ...processed.toJSON(),
      metadata: {
        ...processed.metadata,
        heavyData: new Array(100).fill(0).map((_, i) => ({
          index: i,
          value: Math.random() * 1000,
          timestamp: new Date(),
          data: `Heavy processing data ${i}`.repeat(10),
        })),
      },
    });

    return processedDoc;
  }
}

export default ProcessDocumentsWithoutStream;
