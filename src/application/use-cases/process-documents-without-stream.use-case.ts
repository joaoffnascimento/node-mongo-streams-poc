import { DocumentRepository } from '../../domain/ports/document-repository.port';
import { PerformanceMonitor } from '../../domain/ports/performance-monitor.port';
import { Logger } from '../../domain/ports/logger.port';
import { DocumentProcessingService } from '../../domain/services/document-processing.service';
import { Document } from '../../domain/entities/document.entity';

export interface ProcessTraditionalOptions {
  limit?: number;
  batchSize?: number;
}

export interface ProcessTraditionalResult {
  totalProcessed: number;
  totalTime: number;
  memoryUsed: number;
  method: string;
}

export class ProcessDocumentsWithoutStreamUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly performanceMonitor: PerformanceMonitor,
    private readonly logger: Logger,
    private readonly processingService: DocumentProcessingService
  ) {}

  public async execute(
    options: ProcessTraditionalOptions = {}
  ): Promise<ProcessTraditionalResult> {
    this.logger.info('Starting traditional processing', { options });

    const startTime = Date.now();
    const initialMemory = process.memoryUsage();
    const limit = options.limit || 10000;

    this.logger.info('Loading documents from database', { limit });

    const documents = await this.documentRepository.findAll({ limit });

    this.logger.info('Documents loaded, starting processing', {
      documentsLoaded: documents.length,
    });

    const processedDocuments: Document[] = [];
    let processedCount = 0;

    for (const document of documents) {
      const processed = this.processingService.performHeavyProcessing(document);
      processedDocuments.push(processed);
      processedCount++;

      if (processedCount % 1000 === 0) {
        this.logger.info('Processing progress', {
          processed: processedCount,
          total: documents.length,
        });
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    const finalMemory = process.memoryUsage();
    const totalMemoryUsed = Math.max(
      Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024),
      Math.round(finalMemory.heapUsed / 1024 / 1024)
    );

    this.logger.info('Traditional processing completed', {
      totalProcessed: processedCount,
      totalTime,
      memoryUsed: totalMemoryUsed,
    });

    return {
      totalProcessed: processedCount,
      totalTime,
      memoryUsed: totalMemoryUsed,
      method: 'without-streams',
    };
  }
}
