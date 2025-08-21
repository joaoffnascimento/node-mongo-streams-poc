import { Request, Response } from "express";
import MongoDocumentRepository from "@infrastructure/database/repositories/MongoDocumentRepository";
import ProcessDocumentsWithStream from "@domain/use-cases/ProcessDocumentsWithStream";
import ProcessDocumentsWithoutStream from "@domain/use-cases/ProcessDocumentsWithoutStream";
import PerformanceMonitor from "@infrastructure/monitoring/PerformanceMonitor";
import mongoConnection from "@infrastructure/database/MongoConnection";
import logger from "@infrastructure/monitoring/logger";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface ProcessingResult {
  type: "STREAM" | "TRADITIONAL";
  totalProcessed: number;
  totalTime: number;
  memoryUsed: {
    bytes: number;
    humanReadable: string;
  };
  throughput: {
    documentsPerSecond: number;
    documentsPerSecondFormatted: string;
  };
  method: string;
}

interface ComparisonResult {
  streamProcessing: ProcessingResult;
  traditionalProcessing: ProcessingResult;
  comparison: {
    memoryDifference: string;
    speedDifference: string;
    recommendation: string;
  };
}

export class StreamsController {
  private repository: MongoDocumentRepository;

  constructor() {
    this.repository = new MongoDocumentRepository();
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    try {
      await mongoConnection.connect();
    } catch (error) {
      logger.error("Failed to initialize MongoDB connection", { error });
    }
  }

  private async ensureConnection(): Promise<void> {
    try {
      await mongoConnection.connect();
    } catch (error) {
      logger.error("Failed to ensure MongoDB connection", { error });
      throw new Error("Database connection failed");
    }
  }

  private formatMemory(bytes: number): {
    bytes: number;
    humanReadable: string;
  } {
    const megabytes = bytes / (1024 * 1024);

    if (megabytes < 1) {
      const kilobytes = bytes / 1024;
      return {
        bytes,
        humanReadable: `${kilobytes.toFixed(2)} KB`,
      };
    } else if (megabytes < 1024) {
      return {
        bytes,
        humanReadable: `${megabytes.toFixed(2)} MB`,
      };
    } else {
      const gigabytes = megabytes / 1024;
      return {
        bytes,
        humanReadable: `${gigabytes.toFixed(2)} GB`,
      };
    }
  }

  private calculateThroughput(
    totalProcessed: number,
    totalTimeMs: number
  ): {
    documentsPerSecond: number;
    documentsPerSecondFormatted: string;
  } {
    const documentsPerSecond = Math.round(
      totalProcessed / (totalTimeMs / 1000)
    );
    return {
      documentsPerSecond,
      documentsPerSecondFormatted: `${documentsPerSecond} docs/sec`,
    };
  }

  private createResponse<T>(
    data: T,
    success: boolean = true,
    error?: string
  ): ApiResponse<T> {
    return {
      success,
      data: success ? data : undefined,
      error: error || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/status - Get database status and document count
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      await this.ensureConnection();
      const documentCount = await this.repository.count();

      const response = this.createResponse({
        status: "connected",
        database: "streams-poc",
        documentCount: documentCount.toLocaleString(),
        environment: process.env.NODE_ENV || "development",
      });

      logger.info("Status check completed", { documentCount });
      res.json(response);
    } catch (error: any) {
      logger.error("Status check failed", { error: error.message });
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  /**
   * POST /api/process/stream - Process documents using MongoDB streams
   */
  async processWithStream(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10000 } = req.body;

      if (typeof limit !== "number" || limit <= 0) {
        res
          .status(400)
          .json(this.createResponse(null, false, "Invalid limit parameter"));
        return;
      }

      await this.ensureConnection();

      const monitor = new PerformanceMonitor("stream-processing");
      const useCase = new ProcessDocumentsWithStream(this.repository, monitor);
      const result = await useCase.execute({ limit });

      const processingResult: ProcessingResult = {
        type: "STREAM",
        totalProcessed: result.totalProcessed,
        totalTime: result.totalTime,
        memoryUsed: this.formatMemory(result.memoryUsed),
        throughput: this.calculateThroughput(
          result.totalProcessed,
          result.totalTime
        ),
        method: result.method,
      };

      const response = this.createResponse(processingResult);

      logger.info("Stream processing completed", {
        totalProcessed: result.totalProcessed,
        totalTime: result.totalTime,
      });

      res.json(response);
    } catch (error: any) {
      logger.error("Stream processing failed", { error: error.message });
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  /**
   * POST /api/process/traditional - Process documents using traditional approach
   */
  async processWithoutStream(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10000 } = req.body;

      if (typeof limit !== "number" || limit <= 0) {
        res
          .status(400)
          .json(this.createResponse(null, false, "Invalid limit parameter"));
        return;
      }

      await this.ensureConnection();

      const monitor = new PerformanceMonitor("traditional-processing");
      const useCase = new ProcessDocumentsWithoutStream(
        this.repository,
        monitor
      );
      const result = await useCase.execute({ limit });

      const processingResult: ProcessingResult = {
        type: "TRADITIONAL",
        totalProcessed: result.totalProcessed,
        totalTime: result.totalTime,
        memoryUsed: this.formatMemory(result.memoryUsed),
        throughput: this.calculateThroughput(
          result.totalProcessed,
          result.totalTime
        ),
        method: result.method,
      };

      const response = this.createResponse(processingResult);

      logger.info("Traditional processing completed", {
        totalProcessed: result.totalProcessed,
        totalTime: result.totalTime,
      });

      res.json(response);
    } catch (error: any) {
      logger.error("Traditional processing failed", { error: error.message });
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  /**
   * POST /api/compare - Compare stream vs traditional processing
   */
  async compareProcessing(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10000 } = req.body;

      if (typeof limit !== "number" || limit <= 0) {
        res
          .status(400)
          .json(this.createResponse(null, false, "Invalid limit parameter"));
        return;
      }

      await this.ensureConnection();

      // Execute stream processing
      const streamMonitor = new PerformanceMonitor("compare-stream");
      const streamUseCase = new ProcessDocumentsWithStream(
        this.repository,
        streamMonitor
      );
      const streamResult = await streamUseCase.execute({ limit });

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Execute traditional processing
      const traditionalMonitor = new PerformanceMonitor("compare-traditional");
      const traditionalUseCase = new ProcessDocumentsWithoutStream(
        this.repository,
        traditionalMonitor
      );
      const traditionalResult = await traditionalUseCase.execute({ limit });

      const streamProcessing: ProcessingResult = {
        type: "STREAM",
        totalProcessed: streamResult.totalProcessed,
        totalTime: streamResult.totalTime,
        memoryUsed: this.formatMemory(streamResult.memoryUsed),
        throughput: this.calculateThroughput(
          streamResult.totalProcessed,
          streamResult.totalTime
        ),
        method: streamResult.method,
      };

      const traditionalProcessing: ProcessingResult = {
        type: "TRADITIONAL",
        totalProcessed: traditionalResult.totalProcessed,
        totalTime: traditionalResult.totalTime,
        memoryUsed: this.formatMemory(traditionalResult.memoryUsed),
        throughput: this.calculateThroughput(
          traditionalResult.totalProcessed,
          traditionalResult.totalTime
        ),
        method: traditionalResult.method,
      };

      // Calculate differences
      const memoryRatio =
        traditionalResult.memoryUsed / streamResult.memoryUsed;
      const speedRatio = streamResult.totalTime / traditionalResult.totalTime;

      const comparisonResult: ComparisonResult = {
        streamProcessing,
        traditionalProcessing,
        comparison: {
          memoryDifference: `Stream uses ${memoryRatio.toFixed(
            1
          )}x less memory`,
          speedDifference:
            speedRatio > 1
              ? `Traditional is ${speedRatio.toFixed(1)}x faster`
              : `Stream is ${(1 / speedRatio).toFixed(1)}x faster`,
          recommendation:
            memoryRatio > 2
              ? "Use streams for memory-efficient processing"
              : "Both approaches are viable for this dataset size",
        },
      };

      const response = this.createResponse(comparisonResult);

      logger.info("Processing comparison completed", {
        streamMemory: streamResult.memoryUsed,
        traditionalMemory: traditionalResult.memoryUsed,
        memoryRatio,
      });

      res.json(response);
    } catch (error: any) {
      logger.error("Processing comparison failed", { error: error.message });
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  /**
   * DELETE /api/data - Clear all documents from database
   */
  async clearData(req: Request, res: Response): Promise<void> {
    try {
      await this.ensureConnection();
      const deletedCount = await this.repository.deleteAll();

      const response = this.createResponse({
        message: "All documents cleared successfully",
        deletedCount,
      });

      logger.info("Data cleared", { deletedCount });
      res.json(response);
    } catch (error: any) {
      logger.error("Failed to clear data", { error: error.message });
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }
}
