const chalk = require("chalk");
const ora = require("ora");

class ProcessDocumentsWithoutStream {
  constructor(documentRepository, performanceMonitor) {
    this.repository = documentRepository;
    this.monitor = performanceMonitor;
  }

  async execute(options = {}) {
    const spinner = ora({
      text: "Loading all documents into memory...",
      spinner: "dots",
    }).start();

    try {
      console.log(chalk.bold.red("\n🔴 PROCESSING WITHOUT STREAMS\n"));
      console.log(
        chalk.yellow("⚠️  WARNING: This will load ALL documents into memory!\n")
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

      // PROBLEMA: Carrega TODOS os documentos na memória
      spinner.text = "Loading all documents into memory...";
      const startLoad = Date.now();

      const allDocuments = await this.repository.findAll();

      const loadTime = (Date.now() - startLoad) / 1000;
      spinner.succeed(
        chalk.red(
          `Loaded ${allDocuments.length.toLocaleString()} documents in ${loadTime.toFixed(
            2
          )}s`
        )
      );

      // Verificar memória após carregamento
      const afterLoadMemory = process.memoryUsage();
      const memoryUsed = Math.round(
        (afterLoadMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
      );
      console.log(
        chalk.red(`💾 Memory spike: +${memoryUsed} MB after loading\n`)
      );

      // Processar todos os documentos
      spinner.start("Processing documents...");
      const startProcess = Date.now();
      const processedDocuments = [];

      for (let i = 0; i < allDocuments.length; i++) {
        const doc = allDocuments[i];

        // Simula processamento pesado
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
          `Processed ${processedDocuments.length.toLocaleString()} documents in ${processTime.toFixed(
            2
          )}s`
        )
      );

      // Verificar memória final
      const finalMemory = process.memoryUsage();
      const totalMemoryUsed = Math.round(
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
      );
      console.log(chalk.red(`💾 Total memory used: +${totalMemoryUsed} MB`));

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
    } catch (error) {
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

  heavyProcessing(document) {
    // Simula processamento computacionalmente intensivo
    const processed = document.process();

    // Simula operações custosas
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(processed.value * i);
    }

    // Adiciona mais dados para aumentar uso de memória
    processed.metadata.heavyData = new Array(100).fill(0).map((_, i) => ({
      index: i,
      value: Math.random() * 1000,
      timestamp: new Date(),
      data: `Heavy processing data ${i}`.repeat(10),
    }));

    return processed;
  }
}

module.exports = ProcessDocumentsWithoutStream;
