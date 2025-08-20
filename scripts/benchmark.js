const chalk = require("chalk");
const Table = require("cli-table3");
const MongoDocumentRepository = require("../src/infrastructure/database/repositories/MongoDocumentRepository");
const ProcessDocumentsWithStream = require("../src/domain/use-cases/ProcessDocumentsWithStream");
const ProcessDocumentsWithoutStream = require("../src/domain/use-cases/ProcessDocumentsWithoutStream");
const PerformanceMonitor = require("../src/infrastructure/monitoring/PerformanceMonitor");

async function runBenchmark() {
  console.log(chalk.bold.cyan("\n🏁 MONGODB STREAMS BENCHMARK\n"));

  const repository = new MongoDocumentRepository();

  try {
    // Check database
    const totalCount = await repository.count();
    if (totalCount === 0) {
      console.log(chalk.red("❌ No data found. Run seed script first."));
      process.exit(1);
    }

    console.log(
      chalk.gray(`Found ${totalCount.toLocaleString()} documents in database\n`)
    );

    // Test different batch sizes for streams
    const testSizes = [10000, 50000, 100000];
    const results = [];

    for (const testSize of testSizes) {
      if (testSize > totalCount) continue;

      console.log(
        chalk.bold.yellow(
          `\n📊 Testing with ${testSize.toLocaleString()} documents`
        )
      );
      console.log("─".repeat(60));

      const testResult = {
        size: testSize,
        withStream: null,
        withoutStream: null,
      };

      // Test WITH streams
      console.log(chalk.green("\n🟢 Testing WITH Streams..."));
      try {
        const monitor = new PerformanceMonitor(`Streams - ${testSize}`);
        const useCase = new ProcessDocumentsWithStream(repository, monitor);
        const result = await useCase.execute({ limit: testSize });
        const report = monitor.stop();

        testResult.withStream = {
          ...result,
          peakMemory: report.memory.max.heapUsed,
          avgMemory: report.memory.average.heapUsed,
          gcCount: report.gc.count,
          gcTime: report.gc.totalTime,
        };

        console.log(
          chalk.green(`✅ Completed in ${result.totalTime.toFixed(2)}s`)
        );
      } catch (error) {
        console.log(chalk.red(`❌ Failed: ${error.message}`));
        testResult.withStream = { failed: true, error: error.message };
      }

      // Wait and cleanup
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (global.gc) global.gc();

      // Test WITHOUT streams (only for smaller datasets)
      if (testSize <= 50000) {
        console.log(chalk.red("\n🔴 Testing WITHOUT Streams..."));
        try {
          const monitor = new PerformanceMonitor(`No Streams - ${testSize}`);
          const useCase = new ProcessDocumentsWithoutStream(
            repository,
            monitor
          );
          const result = await useCase.execute({ limit: testSize });
          const report = monitor.stop();

          testResult.withoutStream = {
            ...result,
            peakMemory: report.memory.max.heapUsed,
            avgMemory: report.memory.average.heapUsed,
            gcCount: report.gc.count,
            gcTime: report.gc.totalTime,
          };

          console.log(
            chalk.red(`✅ Completed in ${result.totalTime.toFixed(2)}s`)
          );
        } catch (error) {
          console.log(chalk.red(`❌ Failed: ${error.message}`));
          testResult.withoutStream = { failed: true, error: error.message };
        }
      } else {
        testResult.withoutStream = {
          skipped: true,
          reason: "Too large for memory-based processing",
        };
      }

      results.push(testResult);

      // Wait between tests
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (global.gc) global.gc();
    }

    // Print results table
    console.log("\n" + "═".repeat(120));
    console.log(chalk.bold.cyan("📊 BENCHMARK RESULTS"));
    console.log("═".repeat(120));

    const table = new Table({
      head: [
        chalk.bold("Dataset Size"),
        chalk.bold.green("Streams Time (s)"),
        chalk.bold.green("Streams Peak Mem (MB)"),
        chalk.bold.red("No-Streams Time (s)"),
        chalk.bold.red("No-Streams Peak Mem (MB)"),
        chalk.bold.cyan("Time Improvement"),
        chalk.bold.cyan("Memory Improvement"),
      ],
      colWidths: [15, 18, 22, 20, 24, 18, 20],
    });

    results.forEach((result) => {
      const streamTime = result.withStream?.failed
        ? "FAILED"
        : result.withStream?.totalTime?.toFixed(2) || "N/A";
      const streamMem = result.withStream?.failed
        ? "FAILED"
        : result.withStream?.peakMemory || "N/A";
      const noStreamTime = result.withoutStream?.failed
        ? "FAILED"
        : result.withoutStream?.skipped
        ? "SKIPPED"
        : result.withoutStream?.totalTime?.toFixed(2) || "N/A";
      const noStreamMem = result.withoutStream?.failed
        ? "FAILED"
        : result.withoutStream?.skipped
        ? "SKIPPED"
        : result.withoutStream?.peakMemory || "N/A";

      let timeImprovement = "N/A";
      let memImprovement = "N/A";

      if (
        !result.withStream?.failed &&
        !result.withoutStream?.failed &&
        !result.withoutStream?.skipped
      ) {
        const timeDiff =
          ((result.withoutStream.totalTime - result.withStream.totalTime) /
            result.withoutStream.totalTime) *
          100;
        const memDiff =
          ((result.withoutStream.peakMemory - result.withStream.peakMemory) /
            result.withoutStream.peakMemory) *
          100;
        timeImprovement = `${timeDiff > 0 ? "+" : ""}${timeDiff.toFixed(1)}%`;
        memImprovement = `${memDiff > 0 ? "-" : "+"}${Math.abs(memDiff).toFixed(
          1
        )}%`;
      }

      table.push([
        result.size.toLocaleString(),
        streamTime,
        streamMem,
        noStreamTime,
        noStreamMem,
        timeImprovement,
        memImprovement,
      ]);
    });

    console.log(table.toString());

    // Summary
    console.log("\n" + "═".repeat(120));
    console.log(chalk.bold.cyan("📋 SUMMARY"));
    console.log("═".repeat(120));

    console.log(chalk.bold.green("\n🟢 STREAMS ADVANTAGES:"));
    console.log(
      chalk.green(
        "   ✅ Consistent low memory usage regardless of dataset size"
      )
    );
    console.log(chalk.green("   ✅ Can process unlimited amounts of data"));
    console.log(
      chalk.green("   ✅ Immediate processing start (no loading delay)")
    );
    console.log(
      chalk.green(
        "   ✅ Better for production environments with memory constraints"
      )
    );
    console.log(chalk.green("   ✅ Handles backpressure automatically"));

    console.log(chalk.bold.red("\n🔴 TRADITIONAL PROCESSING LIMITATIONS:"));
    console.log(
      chalk.red("   ❌ Memory usage grows linearly with dataset size")
    );
    console.log(chalk.red("   ❌ Risk of OOM errors with large datasets"));
    console.log(
      chalk.red("   ❌ Requires loading all data before processing starts")
    );
    console.log(
      chalk.red("   ❌ Not suitable for continuous/real-time processing")
    );
    console.log(chalk.red("   ❌ Poor scalability"));

    console.log("\n" + "═".repeat(120));
  } catch (error) {
    console.error(chalk.red("Benchmark failed:"), error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runBenchmark();
}

module.exports = runBenchmark;
