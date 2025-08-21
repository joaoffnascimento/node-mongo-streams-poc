import { Request, Response } from 'express';
import { ProcessDocumentsWithStreamUseCase } from '../../application/use-cases/process-documents-with-stream.use-case';
import { ProcessDocumentsWithoutStreamUseCase } from '../../application/use-cases/process-documents-without-stream.use-case';
import { GetDocumentStatusUseCase } from '../../application/use-cases/get-document-status.use-case';
import { ClearDocumentsUseCase } from '../../application/use-cases/clear-documents.use-case';
import { SeedDatabaseUseCase } from '../../application/use-cases/seed-database.use-case';

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

export class DocumentController {
  constructor(
    private readonly processWithStreamUseCase: ProcessDocumentsWithStreamUseCase,
    private readonly processWithoutStreamUseCase: ProcessDocumentsWithoutStreamUseCase,
    private readonly getStatusUseCase: GetDocumentStatusUseCase,
    private readonly clearDocumentsUseCase: ClearDocumentsUseCase,
    private readonly seedDatabaseUseCase: SeedDatabaseUseCase
  ) {}

  private formatMemory(bytes: number): { bytes: number; humanReadable: string } {
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

  private calculateThroughput(totalProcessed: number, totalTimeMs: number): {
    documentsPerSecond: number;
    documentsPerSecondFormatted: string;
  } {
    const documentsPerSecond = Math.round(totalProcessed / (totalTimeMs / 1000));
    return {
      documentsPerSecond,
      documentsPerSecondFormatted: `${documentsPerSecond} docs/sec`,
    };
  }

  private createResponse<T>(data: T, success: boolean = true, error?: string): ApiResponse<T> {
    return {
      success,
      data: success ? data : undefined,
      error: error || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getStatusUseCase.execute();
      const response = this.createResponse({
        ...result,
        documentCount: result.documentCount.toLocaleString(),
      });
      res.json(response);
    } catch (error: any) {
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  async processWithStream(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10000 } = req.body;

      if (typeof limit !== 'number' || limit <= 0) {
        res.status(400).json(this.createResponse(null, false, 'Invalid limit parameter'));
        return;
      }

      const result = await this.processWithStreamUseCase.execute({ limit });

      const processingResult: ProcessingResult = {
        type: 'STREAM',
        totalProcessed: result.totalProcessed,
        totalTime: result.totalTime,
        memoryUsed: this.formatMemory(result.memoryUsed),
        throughput: this.calculateThroughput(result.totalProcessed, result.totalTime),
        method: result.method,
      };

      res.json(this.createResponse(processingResult));
    } catch (error: any) {
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  async processWithoutStream(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10000 } = req.body;

      if (typeof limit !== 'number' || limit <= 0) {
        res.status(400).json(this.createResponse(null, false, 'Invalid limit parameter'));
        return;
      }

      const result = await this.processWithoutStreamUseCase.execute({ limit });

      const processingResult: ProcessingResult = {
        type: 'TRADITIONAL',
        totalProcessed: result.totalProcessed,
        totalTime: result.totalTime,
        memoryUsed: this.formatMemory(result.memoryUsed),
        throughput: this.calculateThroughput(result.totalProcessed, result.totalTime),
        method: result.method,
      };

      res.json(this.createResponse(processingResult));
    } catch (error: any) {
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  async compareProcessing(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10000 } = req.body;

      if (typeof limit !== 'number' || limit <= 0) {
        res.status(400).json(this.createResponse(null, false, 'Invalid limit parameter'));
        return;
      }

      const streamResult = await this.processWithStreamUseCase.execute({ limit });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const traditionalResult = await this.processWithoutStreamUseCase.execute({ limit });

      const streamProcessing: ProcessingResult = {
        type: 'STREAM',
        totalProcessed: streamResult.totalProcessed,
        totalTime: streamResult.totalTime,
        memoryUsed: this.formatMemory(streamResult.memoryUsed),
        throughput: this.calculateThroughput(streamResult.totalProcessed, streamResult.totalTime),
        method: streamResult.method,
      };

      const traditionalProcessing: ProcessingResult = {
        type: 'TRADITIONAL',
        totalProcessed: traditionalResult.totalProcessed,
        totalTime: traditionalResult.totalTime,
        memoryUsed: this.formatMemory(traditionalResult.memoryUsed),
        throughput: this.calculateThroughput(traditionalResult.totalProcessed, traditionalResult.totalTime),
        method: traditionalResult.method,
      };

      const memoryRatio = traditionalResult.memoryUsed / streamResult.memoryUsed;
      const speedRatio = streamResult.totalTime / traditionalResult.totalTime;

      const comparisonResult: ComparisonResult = {
        streamProcessing,
        traditionalProcessing,
        comparison: {
          memoryDifference: `Stream uses ${memoryRatio.toFixed(1)}x less memory`,
          speedDifference: speedRatio > 1 
            ? `Traditional is ${speedRatio.toFixed(1)}x faster`
            : `Stream is ${(1 / speedRatio).toFixed(1)}x faster`,
          recommendation: memoryRatio > 2
            ? 'Use streams for memory-efficient processing'
            : 'Both approaches are viable for this dataset size',
        },
      };

      res.json(this.createResponse(comparisonResult));
    } catch (error: any) {
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  async clearData(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.clearDocumentsUseCase.execute();
      res.json(this.createResponse(result));
    } catch (error: any) {
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }

  async seedDatabase(req: Request, res: Response): Promise<void> {
    try {
      const { totalDocuments, batchSize } = req.body;

      if (totalDocuments && (typeof totalDocuments !== 'number' || totalDocuments <= 0)) {
        res.status(400).json(this.createResponse(null, false, 'Invalid totalDocuments parameter'));
        return;
      }

      if (batchSize && (typeof batchSize !== 'number' || batchSize <= 0)) {
        res.status(400).json(this.createResponse(null, false, 'Invalid batchSize parameter'));
        return;
      }

      // Don't await - let it run in background
      this.seedDatabaseUseCase.execute({ totalDocuments, batchSize })
        .then((result) => {
          console.log('✅ Database seeding completed:', result.message);
        })
        .catch((error) => {
          console.error('❌ Database seeding failed:', error.message);
        });

      // Return immediately with accepted status
      res.status(202).json(this.createResponse({
        message: 'Database seeding started successfully',
        status: 'in_progress',
        totalDocuments: totalDocuments || parseInt(process.env.TOTAL_DOCUMENTS || '1000000'),
        batchSize: batchSize || parseInt(process.env.SEED_BATCH_SIZE || '5000')
      }));
    } catch (error: any) {
      res.status(500).json(this.createResponse(null, false, error.message));
    }
  }
}