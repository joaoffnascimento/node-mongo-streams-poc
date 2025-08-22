import { DocumentRepository } from '../../domain/ports/document-repository.port';
import { PerformanceMonitor } from '../../domain/ports/performance-monitor.port';
import { Logger } from '../../domain/ports/logger.port';
import { DocumentProcessingService } from '../../domain/services/document-processing.service';
import { Document, DocumentData } from '../../domain/entities/document.entity';
import { stringify } from 'csv-stringify';
import { Readable, Transform } from 'stream';

export interface ProcessToCsvOptions {
  limit?: number;
  batchSize?: number;
}

export interface ProcessToCsvResult {
  totalProcessed: number;
  totalTime: number;
  memoryUsed: number;
  method: string;
  csvStream: Readable;
}

export class ProcessDocumentsToCsvUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly performanceMonitor: PerformanceMonitor,
    private readonly logger: Logger,
    private readonly processingService: DocumentProcessingService
  ) {}

  public async execute(
    options: ProcessToCsvOptions = {}
  ): Promise<ProcessToCsvResult> {
    this.logger.info('Starting stream processing with CSV generation', {
      options,
    });

    const startTime = Date.now();
    const initialMemory = process.memoryUsage();
    let processedCount = 0;
    const limit = options.limit || 1000000; // Default to 1 million documents

    const cursorStreamOptions = {
      batchSize: options.batchSize || 1000,
      limit: limit,
    };

    const cursorStream =
      await this.documentRepository.findAllStream(cursorStreamOptions);

    // CSV header
    const csvColumns = [
      'id',
      'timestamp',
      'original_value',
      'processed_value',
      'squared_value',
      'sqrt_value',
      'category',
      'source',
      'version',
      'tags',
      'description',
      'nested_level3_value',
      'processed_at',
    ];

    // Create a transform stream for processing documents and converting to CSV format
    const processingService = this.processingService;
    const logger = this.logger;
    const documentProcessor = new Transform({
      objectMode: true,
      transform(chunk: DocumentData, encoding, callback) {
        try {
          const document = new Document({
            id: chunk.id,
            timestamp: chunk.timestamp,
            value: chunk.value,
            category: chunk.category,
            metadata: chunk.metadata,
            processed: chunk.processed,
            processedAt: chunk.processedAt,
          });

          // Process the document
          const processedDocument =
            processingService.performHeavyProcessing(document);
          const processedData = processedDocument.toJSON();

          processedCount++;

          if (processedCount % 10000 === 0) {
            logger.info('CSV Processing progress', {
              processed: processedCount,
              total: limit,
            });
          }

          // Convert to CSV row format
          const csvRow = [
            processedData.id,
            processedData.timestamp.toISOString(),
            chunk.value,
            processedData.metadata.processedValue || '',
            processedData.metadata.squared || '',
            processedData.metadata.sqrt || '',
            processedData.category,
            processedData.metadata.source || '',
            processedData.metadata.version || '',
            Array.isArray(processedData.metadata.tags)
              ? processedData.metadata.tags.join(';')
              : '',
            processedData.metadata.description || '',
            processedData.metadata.nested?.level1?.level2?.level3?.value || '',
            processedData.processedAt?.toISOString() || '',
          ];

          callback(null, csvRow);
        } catch (error) {
          callback(error as Error);
        }
      },
    });

    // Create CSV stringify stream
    const csvStringifier = stringify({
      header: true,
      columns: csvColumns,
      delimiter: ',',
    });

    // Create the pipeline: MongoDB cursor -> Document processor -> CSV stringifier
    const csvStream = cursorStream.pipe(documentProcessor).pipe(csvStringifier);

    // Handle errors
    csvStream.on('error', error => {
      this.logger.error('Error in CSV processing stream', {
        error: error.message,
      });
    });

    cursorStream.on('error', error => {
      this.logger.error('Error in MongoDB cursor stream', {
        error: error.message,
      });
    });

    documentProcessor.on('error', error => {
      this.logger.error('Error in document processing', {
        error: error.message,
      });
    });

    const totalTime = (Date.now() - startTime) / 1000;
    const finalMemory = process.memoryUsage();
    const totalMemoryUsed = Math.max(
      Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024),
      Math.round(finalMemory.heapUsed / 1024 / 1024)
    );

    return {
      totalProcessed: processedCount,
      totalTime,
      memoryUsed: totalMemoryUsed,
      method: 'stream-to-csv',
      csvStream,
    };
  }
}
