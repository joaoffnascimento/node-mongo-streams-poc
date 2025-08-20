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
      const self = this;
      const limit = options.limit || Number.MAX_SAFE_INTEGER;

      // Criar cursor stream do MongoDB
      const cursorStreamOptions = {
        batchSize: options.batchSize || 1000,
      };

      if (options.limit) {
        cursorStreamOptions.limit = options.limit;
      }

      const cursorStream = await this.repository.findAllStream(
        cursorStreamOptions
      );

      // Transform stream para processamento
      const processStream = new Transform({
        objectMode: true,
        highWaterMark: options.highWaterMark || 100, // Baixo para demonstrar controle de memória

        transform(chunk, encoding, callback) {
          try {
            // Check if we've reached the limit
            if (processedCount >= limit) {
              callback(); // End the stream
              return;
            }

            // Simula processamento pesado (mesma lógica do non-stream)
            const processed = self.heavyProcessing(chunk);
            processedCount++;

            // Progress tracking
            const progressInterval = Math.max(1000, Math.floor(limit / 20)); // Report progress 20 times during processing
            if (
              processedCount % progressInterval === 0 ||
              processedCount % 5000 === 0
            ) {
              const memory = process.memoryUsage();
              const memoryDelta = Math.round(
                (memory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
              );
              const progress =
                limit !== Number.MAX_SAFE_INTEGER
                  ? ` (${((processedCount / limit) * 100).toFixed(1)}%)`
                  : "";
              console.log(
                chalk.green(
                  `📊 Processed: ${processedCount.toLocaleString()}${progress} | Memory: +${memoryDelta}MB | Heap: ${Math.round(
                    memory.heapUsed / 1024 / 1024
                  )}MB`
                )
              );
            }

            callback(null, processed);
          } catch (error) {
            callback(error);
          }
        },
      });

      // Result collection stream
      const results = [];
      const collectStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          try {
            // Em um cenário real, você poderia:
            // 1. Escrever diretamente para outro banco
            // 2. Enviar para uma fila
            // 3. Fazer streaming para um arquivo
            // Aqui coletamos apenas para demonstração
            results.push(chunk);
            callback(null, chunk); // Pass the chunk through the pipeline
          } catch (error) {
            callback(error);
          }
        },
      });

      const spinner = ora({
        text: chalk.green("Processing documents with streams..."),
        spinner: "dots",
      }).start();

      try {
        // Execute pipeline
        await pipelineAsync(cursorStream, processStream, collectStream);

        spinner.succeed(chalk.green(`✅ Pipeline completed successfully`));
      } catch (pipelineError) {
        spinner.fail(chalk.red("Pipeline processing failed"));
        throw pipelineError;
      }

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
