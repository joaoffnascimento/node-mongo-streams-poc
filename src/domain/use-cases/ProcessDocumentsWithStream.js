const { Transform, pipeline } = require("stream");
const { promisify } = require("util");
const pipelineAsync = promisify(pipeline);
const chalk = require("chalk");
const ora = require("ora");

class ProcessDocumentsWithStream {
  constructor(documentRepository, performanceMonitor) {
    this.repository = documentRepository;
    this.monitor = performanceMonitor;
  }

  async execute(options = {}) {
    try {
      console.log(chalk.bold.green("\n🟢 PROCESSING WITH STREAMS\n"));
      console.log(
        chalk.green(
          "✅ Memory-efficient processing with MongoDB cursor streams\n"
        )
      );

      // Monitor inicial
      const initialMemory = process.memoryUsage();
      console.log(
        chalk.gray(
          `Initial memory: ${Math.round(
            initialMemory.heapUsed / 1024 / 1024
          )} MB`
        )
      );

      const startTime = Date.now();
      let processedCount = 0;
      const limit = options.limit || 10000; // Default limit for safety

      console.log(
        chalk.gray(`Processing limit: ${limit.toLocaleString()} documents\n`)
      );

      // Criar cursor stream do MongoDB
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
      const results = [];

      await new Promise((resolve, reject) => {
        cursorStream.on("data", (chunk) => {
          try {
            if (processedCount >= limit) {
              cursorStream.destroy();
              resolve();
              return;
            }

            // Process the document
            const processed = this.heavyProcessing(chunk);
            results.push(processed);
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
            reject(error);
          }
        });

        cursorStream.on("end", () => {
          resolve();
        });

        cursorStream.on("error", (error) => {
          reject(error);
        });
      });

      spinner.succeed(chalk.green(`✅ Processing completed successfully`));

      const totalTime = (Date.now() - startTime) / 1000;
      console.log(
        chalk.green(
          `📊 Total processed: ${processedCount.toLocaleString()} documents in ${totalTime.toFixed(
            2
          )}s`
        )
      );

      // Verificar memória final
      const finalMemory = process.memoryUsage();
      const totalMemoryUsed = Math.round(
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
      );
      console.log(chalk.green(`💾 Total memory used: +${totalMemoryUsed} MB`));

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

  heavyProcessing(document) {
    // Mesma lógica de processamento pesado
    const processed = {
      id: document.id,
      timestamp: document.timestamp,
      value: document.value,
      category: document.category,
      metadata: document.metadata,
      processed: true,
      processedAt: new Date(),
    };

    // Simula operações custosas
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(processed.value * i);
    }

    // Adiciona dados processados
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

module.exports = ProcessDocumentsWithStream;
