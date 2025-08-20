#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import MongoDocumentRepository from "@infrastructure/database/repositories/MongoDocumentRepository";
import ProcessDocumentsWithStream from "@domain/use-cases/ProcessDocumentsWithStream";
import ProcessDocumentsWithoutStream from "@domain/use-cases/ProcessDocumentsWithoutStream";
import PerformanceMonitor from "@infrastructure/monitoring/PerformanceMonitor";
import mongoConnection from "@infrastructure/database/MongoConnection";

const program = new Command();

program
  .name("mongodb-streams-poc")
  .description("POC demonstrating MongoDB Streams vs Traditional Processing")
  .version("1.0.0");

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
    } catch (error: any) {
      console.error(chalk.red("Failed to check status:"), error.message);
      process.exit(1);
    } finally {
      // Close MongoDB connection to allow process to exit
      await mongoConnection.disconnect();
      process.exit(0);
    }
  });

program
  .command("test:stream")
  .description("Test stream processing with TypeScript")
  .action(async () => {
    const monitor = new PerformanceMonitor("Processing WITH Streams (TS)");
    const repository = new MongoDocumentRepository();
    const useCase = new ProcessDocumentsWithStream(repository, monitor);

    try {
      const totalCount = await repository.count();
      const processingLimit = Math.min(totalCount, 10000); // Process max 10k for test

      const result = await useCase.execute({ limit: processingLimit });
      console.log(chalk.bold.green("\n📊 RESULTS (TS STREAMS):"));
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
    } catch (error: any) {
      console.error(
        chalk.red("Failed to process with streams:"),
        error.message
      );
      process.exit(1);
    } finally {
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
