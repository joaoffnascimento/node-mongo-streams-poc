import { DocumentRepository } from '../../domain/ports/document-repository.port';
import { PerformanceMonitor } from '../../domain/ports/performance-monitor.port';
import { Logger } from '../../domain/ports/logger.port';
import { DocumentProcessingService } from '../../domain/services/document-processing.service';

export interface ProcessStreamOptions {
  limit?: number;
  batchSize?: number;
}

export interface ProcessStreamResult {
  totalProcessed: number;
  totalTime: number;
  memoryUsed: number;
  method: string;
}

export class ProcessDocumentsWithStreamUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly performanceMonitor: PerformanceMonitor,
    private readonly logger: Logger,
    private readonly processingService: DocumentProcessingService
  ) {}

  public async execute(
    options: ProcessStreamOptions = {}
  ): Promise<ProcessStreamResult> {
    this.logger.info('Starting stream processing', { options });

    const startTime = Date.now();
    const initialMemory = process.memoryUsage();
    let processedCount = 0;
    const limit = options.limit || 10000;

    const cursorStreamOptions = {
      batchSize: options.batchSize || 1000,
      limit: limit,
    };

    const cursorStream =
      await this.documentRepository.findAllStream(cursorStreamOptions);

    await new Promise<void>((resolve, reject) => {
      cursorStream.on('data', (chunk: any) => {
        try {
          if (processedCount >= limit) {
            if (
              'destroy' in cursorStream &&
              typeof cursorStream.destroy === 'function'
            ) {
              cursorStream.destroy();
            }
            resolve();
            return;
          }

          this.processingService.performHeavyProcessing({
            id: chunk.id,
            timestamp: chunk.timestamp,
            value: chunk.value,
            category: chunk.category,
            metadata: chunk.metadata,
            processed: chunk.processed,
            processedAt: chunk.processedAt,
          } as any);

          processedCount++;

          if (processedCount % 1000 === 0) {
            this.logger.info('Processing progress', {
              processed: processedCount,
              total: limit,
            });
          }
        } catch (error) {
          reject(error as Error);
        }
      });

      cursorStream.on('end', () => resolve());
      cursorStream.on('error', (error: Error) => reject(error));
    });

    const totalTime = (Date.now() - startTime) / 1000;
    const finalMemory = process.memoryUsage();
    const totalMemoryUsed = Math.max(
      Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024),
      Math.round(finalMemory.heapUsed / 1024 / 1024)
    );

    this.logger.info('Stream processing completed', {
      totalProcessed: processedCount,
      totalTime,
      memoryUsed: totalMemoryUsed,
    });

    return {
      totalProcessed: processedCount,
      totalTime,
      memoryUsed: totalMemoryUsed,
      method: 'with-streams',
    };
  }
}
