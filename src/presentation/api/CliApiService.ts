import { Request, Response } from "express";
import { spawn, ChildProcess } from "child_process";
import MongoDocumentRepository from "@infrastructure/database/repositories/MongoDocumentRepository";
import ProcessDocumentsWithStream from "@domain/use-cases/ProcessDocumentsWithStream";
import ProcessDocumentsWithoutStream from "@domain/use-cases/ProcessDocumentsWithoutStream";
import PerformanceMonitor from "@infrastructure/monitoring/PerformanceMonitor";
import mongoConnection from "@infrastructure/database/MongoConnection";
import logger from "@infrastructure/monitoring/logger";

interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  performanceReport?: any;
}

interface MemoryReport {
  bytes: number;
  megabytes: string;
  formatted: string;
  humanReadable: string;
}

interface DetailedPerformanceReport {
  totalProcessed: number;
  totalTime: number;
  totalTimeFormatted: string;
  memoryUsed: MemoryReport;
  method: string;
  throughput: {
    documentsPerSecond: number;
    documentsPerSecondFormatted: string;
  };
  efficiency: {
    memoryPerDocument: string;
    timePerDocument: string;
  };
}

export class CliApiService {
  private repository!: MongoDocumentRepository;

  constructor() {
    this.initializeServices();
  }

  private async initializeServices() {
    await mongoConnection.connect();
    this.repository = new MongoDocumentRepository();
  }

  async ensureConnection() {
    try {
      await mongoConnection.connect();
      this.repository = new MongoDocumentRepository();
    } catch (error) {
      logger.error("Failed to ensure MongoDB connection", { error });
      throw error;
    }
  }

  /**
   * GET /api/status - Get database status and document count
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      await this.ensureConnection();

      const documentCount = await this.repository.count();

      // Update MongoDB metrics for Prometheus

      const response = {
        success: true,
        data: {
          status: "connected",
          database: "streams-poc",
          documentCount: documentCount.toLocaleString(),
          timestamp: new Date().toISOString(),
        },
      };

      logger.info("API: Status check completed", { documentCount });
      res.json(response);
    } catch (error: any) {
      logger.error("API: Status check failed", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/process/stream - Process documents with streams
   */
  private formatMemoryReport(bytes: number): MemoryReport {
    const megabytes = bytes / (1024 * 1024);
    const megabytesString = megabytes.toFixed(2);

    let humanReadable: string;
    if (megabytes < 1) {
      const kilobytes = bytes / 1024;
      humanReadable = `${kilobytes.toFixed(2)} KB`;
    } else if (megabytes < 1024) {
      humanReadable = `${megabytesString} MB`;
    } else {
      const gigabytes = megabytes / 1024;
      humanReadable = `${gigabytes.toFixed(2)} GB`;
    }

    return {
      bytes,
      megabytes: megabytesString,
      formatted: `${megabytesString} MB`,
      humanReadable,
    };
  }

  private createDetailedPerformanceReport(
    performanceData: any,
    method: string
  ): DetailedPerformanceReport {
    const throughputPerSecond =
      performanceData.totalProcessed / (performanceData.totalTime / 1000);
    const memoryPerDoc =
      performanceData.memoryUsed / performanceData.totalProcessed;
    const timePerDoc =
      performanceData.totalTime / performanceData.totalProcessed;

    return {
      totalProcessed: performanceData.totalProcessed,
      totalTime: performanceData.totalTime,
      totalTimeFormatted: `${performanceData.totalTime}ms (${(
        performanceData.totalTime / 1000
      ).toFixed(2)}s)`,
      memoryUsed: this.formatMemoryReport(performanceData.memoryUsed),
      method,
      throughput: {
        documentsPerSecond: Math.round(throughputPerSecond),
        documentsPerSecondFormatted: `${Math.round(
          throughputPerSecond
        )} docs/sec`,
      },
      efficiency: {
        memoryPerDocument:
          this.formatMemoryReport(memoryPerDoc).humanReadable + " per doc",
        timePerDocument: `${timePerDoc.toFixed(2)}ms per doc`,
      },
    };
  }

  async processWithStream(limit: number = 10000): Promise<CommandResult> {
    try {
      await this.ensureConnection();

      const startTime = Date.now();

      const monitor = new PerformanceMonitor("stream-processing");
      const useCase = new ProcessDocumentsWithStream(this.repository, monitor);
      const result = await useCase.execute({ limit });

      const executionTime = Date.now() - startTime;
      const durationSeconds = executionTime / 1000;


      const detailedReport = this.createDetailedPerformanceReport(
        {
          totalProcessed: result.totalProcessed,
          totalTime: result.totalTime,
          memoryUsed: result.memoryUsed,
        },
        "MongoDB Streaming"
      );

      const response: CommandResult = {
        success: true,
        data: {
          type: "STREAM_PROCESSING",
          totalProcessed: result.totalProcessed,
          totalTime: result.totalTime,
          memoryUsed: this.formatMemoryReport(result.memoryUsed),
          method: result.method,
          performance: detailedReport,
          advantages: [
            "Low, consistent memory usage",
            "Immediate processing start",
            "Backpressure handling",
            "Scalable for any dataset size",
          ],
        },
        executionTime,
        performanceReport: detailedReport,
      };

      logger.info("API: Stream processing completed", {
        totalProcessed: result.totalProcessed,
        executionTime,
      });

      return response;
    } catch (error: any) {
      logger.error("API: Stream processing failed", { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async processWithoutStream(limit: number = 10000): Promise<CommandResult> {
    try {
      await this.ensureConnection();

      const startTime = Date.now();

      const monitor = new PerformanceMonitor("no-stream-processing");
      const useCase = new ProcessDocumentsWithoutStream(
        this.repository,
        monitor
      );
      const result = await useCase.execute({ limit });

      const executionTime = Date.now() - startTime;
      const durationSeconds = executionTime / 1000;


      const detailedReport = this.createDetailedPerformanceReport(
        {
          totalProcessed: result.totalProcessed,
          totalTime: result.totalTime,
          memoryUsed: result.memoryUsed,
        },
        "Traditional Processing"
      );

      const response: CommandResult = {
        success: true,
        data: {
          type: "TRADITIONAL_PROCESSING",
          totalProcessed: result.totalProcessed,
          loadTime: result.loadTime,
          processTime: result.processTime,
          totalTime: result.totalTime,
          memoryUsed: this.formatMemoryReport(result.memoryUsed),
          method: result.method,
          performance: detailedReport,
          disadvantages: [
            "High memory usage",
            "Loading wait time",
            "Memory spikes",
            "Not scalable for large datasets",
          ],
        },
        executionTime,
        performanceReport: detailedReport,
      };

      logger.info("API: Traditional processing completed", {
        totalProcessed: result.totalProcessed,
        executionTime,
      });

      return response;
    } catch (error: any) {
      logger.error("API: Traditional processing failed", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async compareProcessing(limit: number = 10000): Promise<CommandResult> {
    try {
      await this.ensureConnection();

      const startTime = Date.now();

      console.log("[API] Starting comparison between processing methods...");

      // Run stream processing
      const streamMonitor = new PerformanceMonitor("compare-stream");
      const streamUseCase = new ProcessDocumentsWithStream(
        this.repository,
        streamMonitor
      );
      const streamResult = await streamUseCase.execute({ limit });

      // Wait a bit between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Run traditional processing
      const traditionalMonitor = new PerformanceMonitor("compare-no-stream");
      const traditionalUseCase = new ProcessDocumentsWithoutStream(
        this.repository,
        traditionalMonitor
      );
      const traditionalResult = await traditionalUseCase.execute({ limit });

      const executionTime = Date.now() - startTime;

      // Create detailed reports for both methods
      const streamDetailedReport = this.createDetailedPerformanceReport(
        {
          totalProcessed: streamResult.totalProcessed,
          totalTime: streamResult.totalTime,
          memoryUsed: streamResult.memoryUsed,
        },
        "MongoDB Streaming"
      );

      const traditionalDetailedReport = this.createDetailedPerformanceReport(
        {
          totalProcessed: traditionalResult.totalProcessed,
          totalTime: traditionalResult.totalTime,
          memoryUsed: traditionalResult.memoryUsed,
        },
        "Traditional Processing"
      );

      const comparison = {
        stream: {
          totalProcessed: streamResult.totalProcessed,
          totalTime: streamResult.totalTime,
          memoryUsed: this.formatMemoryReport(streamResult.memoryUsed),
          method: streamResult.method,
          performance: streamDetailedReport,
        },
        traditional: {
          totalProcessed: traditionalResult.totalProcessed,
          totalTime: traditionalResult.totalTime,
          memoryUsed: this.formatMemoryReport(traditionalResult.memoryUsed),
          method: traditionalResult.method,
          loadTime: traditionalResult.loadTime,
          processTime: traditionalResult.processTime,
          performance: traditionalDetailedReport,
        },
        winner:
          streamResult.totalTime < traditionalResult.totalTime
            ? "stream"
            : "traditional",
        memoryEfficiency:
          streamResult.memoryUsed < traditionalResult.memoryUsed
            ? "stream"
            : "traditional",
        timeDifference: Math.abs(
          streamResult.totalTime - traditionalResult.totalTime
        ),
        memoryDifference: this.formatMemoryReport(
          Math.abs(streamResult.memoryUsed - traditionalResult.memoryUsed)
        ),
      };


      const response: CommandResult = {
        success: true,
        data: {
          type: "COMPARISON",
          comparison,
          summary: {
            fasterMethod: comparison.winner,
            memoryEfficientMethod: comparison.memoryEfficiency,
            timeSavedMs: comparison.timeDifference,
            timeSavedFormatted: `${comparison.timeDifference}ms (${(
              comparison.timeDifference / 1000
            ).toFixed(2)}s)`,
            memorySaved: comparison.memoryDifference,
            performanceGain: {
              timeImprovement: `${(
                (comparison.timeDifference /
                  Math.max(
                    streamResult.totalTime,
                    traditionalResult.totalTime
                  )) *
                100
              ).toFixed(1)}%`,
              memoryImprovement: `${(
                (Math.abs(
                  streamResult.memoryUsed - traditionalResult.memoryUsed
                ) /
                  Math.max(
                    streamResult.memoryUsed,
                    traditionalResult.memoryUsed
                  )) *
                100
              ).toFixed(1)}%`,
            },
          },
        },
        executionTime,
        performanceReport: {
          stream: streamDetailedReport,
          traditional: traditionalDetailedReport,
          comparisonSummary: {
            fasterMethod: comparison.winner,
            memoryEfficientMethod: comparison.memoryEfficiency,
            timeSaved: comparison.timeDifference,
            memorySaved: comparison.memoryDifference,
          },
        },
      };

      logger.info("API: Comparison completed", {
        streamTime: streamResult.totalTime,
        traditionalTime: traditionalResult.totalTime,
        winner: comparison.winner,
      });

      return response;
    } catch (error: any) {
      logger.error("API: Comparison failed", { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * POST /api/seed - Seed database with documents
   */
  async seedDatabase(req: Request, res: Response): Promise<void> {
    try {
      await this.ensureConnection();

      const { count = 100000 } = req.body;
      const startTime = Date.now();

      // Use existing seed script logic but return JSON
      const result = await this.runSeedCommand(count);
      const executionTime = Date.now() - startTime;

      logger.info("API: Database seeding completed", { count, executionTime });

      res.json({
        success: true,
        data: {
          type: "DATABASE_SEEDING",
          documentsCreated: count,
          totalTime: executionTime,
        },
        executionTime,
      });
    } catch (error: any) {
      logger.error("API: Database seeding failed", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/clear - Clear database
   */
  async clearDatabase(req: Request, res: Response): Promise<void> {
    try {
      await this.ensureConnection();

      const startTime = Date.now();
      const result = await this.repository.deleteAll();
      const executionTime = Date.now() - startTime;

      logger.info("API: Database cleared", {
        deletedCount: result.deletedCount,
      });

      res.json({
        success: true,
        data: {
          type: "DATABASE_CLEAR",
          deletedCount: result.deletedCount,
        },
        executionTime,
      });
    } catch (error: any) {
      logger.error("API: Database clear failed", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  private async runSeedCommand(count: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const seedProcess = spawn("npm", ["run", "seed"], {
        env: { ...process.env, TOTAL_DOCUMENTS: count.toString() },
        stdio: "pipe",
      });

      let output = "";
      seedProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      seedProcess.on("close", (code) => {
        if (code === 0) {
          resolve({ output });
        } else {
          reject(new Error(`Seed command failed with code ${code}`));
        }
      });
    });
  }

  async cleanup() {
    // MongoDB connection cleanup will be handled by the connection instance
    logger.info("API service cleanup completed");
  }
}

export default CliApiService;
