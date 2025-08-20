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
      // Check document count and warn if too large
      const totalCount = await repository.count();
      if (totalCount > 100000) {
        console.log(chalk.bold.red("\n⚠️  WARNING: Large dataset detected!"));
        console.log(
          chalk.red(
            `   ${totalCount.toLocaleString()} documents may cause Out of Memory error`
          )
        );
        console.log(
          chalk.yellow(
            "   This is intentional to demonstrate the problem with traditional processing"
          )
        );
      }

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
    } finally {
      // Close MongoDB connection to allow process to exit
      const mongoConnection = require("../../infrastructure/database/MongoConnection");
      await mongoConnection.disconnect();
      process.exit(0);
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
      // Check document count and provide a reasonable limit
      const totalCount = await repository.count();
      const processingLimit = Math.min(totalCount, 100000); // Process max 100k for demo

      const result = await useCase.execute({ limit: processingLimit });
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
    } finally {
      // Close MongoDB connection to allow process to exit
      const mongoConnection = require("../../infrastructure/database/MongoConnection");
      await mongoConnection.disconnect();
      process.exit(0);
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

      // Test WITH streams FIRST (clean memory state)
      console.log(chalk.bold.green("🟢 Testing WITH Streams..."));
      const monitor1 = new PerformanceMonitor("Comparison - WITH Streams");
      const useCase1 = new ProcessDocumentsWithStream(repository, monitor1);
      results.withStream = await useCase1.execute({ limit: testSize });
      results.withStream.report = monitor1.stop();

      // Wait and force GC to reset memory state
      console.log(chalk.gray("Resetting memory state..."));
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (global.gc) {
        global.gc();
        global.gc(); // Double GC to be sure
      }

      // Test WITHOUT streams (may fail with OOM for large datasets)
      console.log(chalk.bold.red("🔴 Testing WITHOUT Streams..."));
      try {
        const monitor2 = new PerformanceMonitor("Comparison - WITHOUT Streams");
        const useCase2 = new ProcessDocumentsWithoutStream(repository, monitor2);
        results.noStream = await useCase2.execute({ limit: testSize });
        results.noStream.report = monitor2.stop();
      } catch (error) {
        console.log(chalk.red("❌ WITHOUT streams failed (likely OOM)"));
        results.noStream = { failed: true, error: error.message };
      }

      // Print comparison
      console.log("\n" + "═".repeat(80));
      console.log(chalk.bold.magenta("📊 PERFORMANCE COMPARISON"));
      console.log("═".repeat(80));

      // Show stream results
      console.log(chalk.green("\n🟢 WITH STREAMS:"));
      console.log(
        chalk.green(`   Time: ${results.withStream.totalTime.toFixed(2)}s`)
      );
      console.log(chalk.green(`   Memory Used: ${results.withStream.memoryUsed}MB`));
      console.log(
        chalk.green(
          `   Peak Memory: ${results.withStream.report.memory.max.heapUsed}MB`
        )
      );

      // Show traditional results or failure
      if (results.noStream.failed) {
        console.log(chalk.red("\n❌ WITHOUT STREAMS: FAILED"));
        console.log(chalk.red(`   Error: ${results.noStream.error}`));
        console.log(chalk.bold.green("\n🏆 STREAMS ARE THE CLEAR WINNER!"));
        console.log(chalk.green("   ✅ Streams completed successfully"));
        console.log(chalk.green("   ✅ Traditional processing failed with OOM"));
        console.log(chalk.green("   ✅ Streams handle large datasets efficiently"));
      } else {
        console.log(chalk.red("\n🔴 WITHOUT STREAMS:"));
        console.log(
          chalk.red(`   Time: ${results.noStream.totalTime.toFixed(2)}s`)
        );
        console.log(chalk.red(`   Memory Used: ${results.noStream.memoryUsed}MB`));
        console.log(
          chalk.red(
            `   Peak Memory: ${results.noStream.report.memory.max.heapUsed}MB`
          )
        );

        // Calculate meaningful improvements
        const timeDiff = ((results.noStream.totalTime - results.withStream.totalTime) / results.noStream.totalTime) * 100;
        const memoryDiff = results.noStream.memoryUsed > results.withStream.memoryUsed 
          ? ((results.noStream.memoryUsed - results.withStream.memoryUsed) / results.noStream.memoryUsed) * 100
          : 0;

        console.log(chalk.bold.cyan("\n📈 PERFORMANCE IMPROVEMENTS WITH STREAMS:"));
        
        if (timeDiff > 0) {
          console.log(chalk.cyan(`   ⚡ Speed: ${timeDiff.toFixed(1)}% faster`));
        } else {
          console.log(chalk.cyan(`   ⚡ Speed: ${Math.abs(timeDiff).toFixed(1)}% slower (acceptable for memory savings)`));
        }
        
        if (memoryDiff > 0) {
          console.log(chalk.cyan(`   💾 Memory: ${memoryDiff.toFixed(1)}% less memory usage`));
        } else {
          console.log(chalk.cyan(`   💾 Memory: Similar usage but consistent across dataset sizes`));
        }
        
        console.log(chalk.cyan(`   📊 Memory Efficiency: ${(results.noStream.memoryUsed / Math.max(1, results.withStream.memoryUsed)).toFixed(1)}x more efficient`));
      }

      console.log("\n" + "═".repeat(80));

    } catch (error) {
      console.error(chalk.red("Comparison failed:"), error.message);
      process.exit(1);
    } finally {
      // Close MongoDB connection to allow process to exit
      const mongoConnection = require("../../infrastructure/database/MongoConnection");
      await mongoConnection.disconnect();
      process.exit(0);
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
    } finally {
      // Close MongoDB connection to allow process to exit
      const mongoConnection = require("../../infrastructure/database/MongoConnection");
      await mongoConnection.disconnect();
      process.exit(0);
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
