#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk");
const MongoDocumentRepository = require("../../infrastructure/database/repositories/MongoDocumentRepository");
const ProcessDocumentsWithStream = require("../../domain/use-cases/ProcessDocumentsWithStream");
const ProcessDocumentsWithoutStream = require("../../domain/use-cases/ProcessDocumentsWithoutStream");
const PerformanceMonitor = require("../../infrastructure/monitoring/PerformanceMonitor");
const seedDatabase = require("../../../scripts/seed");

const program = new Command();

program
  .name("mongodb-streams-poc")
  .description("POC demonstrating MongoDB Streams vs Traditional Processing")
  .version("1.0.0");

program
  .command("seed")
  .description("Seed the database with sample documents")
  .action(async () => {
    console.log(chalk.bold.cyan("\n🌱 Starting database seeding...\n"));
    await seedDatabase();
  });

program
  .command("process:no-stream")
  .description("Process documents WITHOUT streams (loads all into memory)")
  .action(async () => {
    const monitor = new PerformanceMonitor("Processing WITHOUT Streams");
    const repository = new MongoDocumentRepository();
    const useCase = new ProcessDocumentsWithoutStream(repository, monitor);

    try {
      const result = await useCase.execute();
      console.log(chalk.bold.yellow("\n📊 RESULTS (NO STREAMS):"));
      console.log(
        chalk.yellow(
          `   Total processed: ${result.totalProcessed.toLocaleString()}`
        )
      );
      console.log(chalk.yellow(`   Load time: ${result.loadTime.toFixed(2)}s`));
      console.log(
        chalk.yellow(`   Process time: ${result.processTime.toFixed(2)}s`)
      );
      console.log(
        chalk.yellow(`   Total time: ${result.totalTime.toFixed(2)}s`)
      );
      console.log(chalk.yellow(`   Memory used: ${result.memoryUsed}MB`));

      monitor.printReport();
    } catch (error) {
      console.error(
        chalk.red("Failed to process without streams:"),
        error.message
      );
      process.exit(1);
    }
  });

program
  .command("process:stream")
  .description("Process documents WITH streams (memory efficient)")
  .action(async () => {
    const monitor = new PerformanceMonitor("Processing WITH Streams");
    const repository = new MongoDocumentRepository();
    const useCase = new ProcessDocumentsWithStream(repository, monitor);

    try {
      const result = await useCase.execute();
      console.log(chalk.bold.green("\n📊 RESULTS (WITH STREAMS):"));
      console.log(
        chalk.green(
          `   Total processed: ${result.totalProcessed.toLocaleString()}`
        )
      );
      console.log(
        chalk.green(`   Total time: ${result.totalTime.toFixed(2)}s`)
      );
      console.log(chalk.green(`   Memory used: ${result.memoryUsed}MB`));

      monitor.printReport();
    } catch (error) {
      console.error(
        chalk.red("Failed to process with streams:"),
        error.message
      );
      process.exit(1);
    }
  });

program
  .command("compare")
  .description("Run both processing methods and compare results")
  .action(async () => {
    console.log(chalk.bold.magenta("\n🔄 RUNNING COMPARISON TEST\n"));

    const repository = new MongoDocumentRepository();

    try {
      // Check if we have data
      const count = await repository.count();
      if (count === 0) {
        console.log(chalk.yellow('No data found. Run "seed" command first.'));
        process.exit(1);
      }

      console.log(
        chalk.gray(`Found ${count.toLocaleString()} documents in database\n`)
      );

      // Test with smaller subset for comparison
      const testSize = Math.min(count, 50000); // Limit for comparison
      console.log(
        chalk.gray(
          `Running comparison with ${testSize.toLocaleString()} documents\n`
        )
      );

      const results = {};

      // Test WITHOUT streams
      console.log(chalk.bold.red("🔴 Testing WITHOUT Streams..."));
      try {
        const monitor1 = new PerformanceMonitor("Comparison - WITHOUT Streams");
        const useCase1 = new ProcessDocumentsWithoutStream(
          repository,
          monitor1
        );
        results.noStream = await useCase1.execute({ limit: testSize });
        results.noStream.report = monitor1.stop();
      } catch (error) {
        console.log(chalk.red("❌ WITHOUT streams failed (likely OOM)"));
        results.noStream = { failed: true, error: error.message };
      }

      // Wait a bit and force GC
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (global.gc) global.gc();

      // Test WITH streams
      console.log(chalk.bold.green("\n🟢 Testing WITH Streams..."));
      const monitor2 = new PerformanceMonitor("Comparison - WITH Streams");
      const useCase2 = new ProcessDocumentsWithStream(repository, monitor2);
      results.withStream = await useCase2.execute({ limit: testSize });
      results.withStream.report = monitor2.stop();

      // Print comparison
      console.log("\n" + "═".repeat(80));
      console.log(chalk.bold.magenta("📊 PERFORMANCE COMPARISON"));
      console.log("═".repeat(80));

      if (results.noStream.failed) {
        console.log(chalk.red("\n❌ WITHOUT STREAMS: FAILED"));
        console.log(chalk.red(`   Error: ${results.noStream.error}`));
      } else {
        console.log(chalk.red("\n🔴 WITHOUT STREAMS:"));
        console.log(
          chalk.red(`   Time: ${results.noStream.totalTime.toFixed(2)}s`)
        );
        console.log(chalk.red(`   Memory: ${results.noStream.memoryUsed}MB`));
        console.log(
          chalk.red(
            `   Peak Memory: ${results.noStream.report.memory.max.heapUsed}MB`
          )
        );
      }

      console.log(chalk.green("\n🟢 WITH STREAMS:"));
      console.log(
        chalk.green(`   Time: ${results.withStream.totalTime.toFixed(2)}s`)
      );
      console.log(chalk.green(`   Memory: ${results.withStream.memoryUsed}MB`));
      console.log(
        chalk.green(
          `   Peak Memory: ${results.withStream.report.memory.max.heapUsed}MB`
        )
      );

      if (!results.noStream.failed) {
        const timeDiff =
          ((results.noStream.totalTime - results.withStream.totalTime) /
            results.noStream.totalTime) *
          100;
        const memoryDiff =
          ((results.noStream.report.memory.max.heapUsed -
            results.withStream.report.memory.max.heapUsed) /
            results.noStream.report.memory.max.heapUsed) *
          100;

        console.log(chalk.bold.cyan("\n📈 IMPROVEMENTS:"));
        console.log(
          chalk.cyan(
            `   Time: ${timeDiff > 0 ? "+" : ""}${timeDiff.toFixed(1)}%`
          )
        );
        console.log(
          chalk.cyan(
            `   Memory: ${memoryDiff > 0 ? "-" : "+"}${Math.abs(
              memoryDiff
            ).toFixed(1)}%`
          )
        );
      }

      console.log("\n" + "═".repeat(80));
    } catch (error) {
      console.error(chalk.red("Comparison failed:"), error.message);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show database status and document count")
  .action(async () => {
    const repository = new MongoDocumentRepository();

    try {
      const count = await repository.count();
      console.log(chalk.bold.cyan("\n📊 DATABASE STATUS\n"));
      console.log(chalk.gray(`Total documents: ${count.toLocaleString()}`));

      if (count === 0) {
        console.log(
          chalk.yellow('\n💡 Run "seed" command to populate the database')
        );
      } else {
        console.log(chalk.green("\n✅ Database is ready for testing"));
        console.log(chalk.gray("Available commands:"));
        console.log(
          chalk.gray("  • process:no-stream - Traditional processing")
        );
        console.log(chalk.gray("  • process:stream    - Stream processing"));
        console.log(chalk.gray("  • compare          - Compare both methods"));
      }
    } catch (error) {
      console.error(chalk.red("Failed to check status:"), error.message);
      process.exit(1);
    }
  });

// Error handling
program.on("command:*", () => {
  console.error(
    chalk.red("Invalid command. Use --help to see available commands.")
  );
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
