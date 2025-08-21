import { DocumentController } from '../controllers/document.controller';
import { ProcessDocumentsWithStreamUseCase } from '../../application/use-cases/process-documents-with-stream.use-case';
import { ProcessDocumentsWithoutStreamUseCase } from '../../application/use-cases/process-documents-without-stream.use-case';
import { GetDocumentStatusUseCase } from '../../application/use-cases/get-document-status.use-case';
import { ClearDocumentsUseCase } from '../../application/use-cases/clear-documents.use-case';
import { SeedDatabaseUseCase } from '../../application/use-cases/seed-database.use-case';
import { MongoDocumentRepositoryAdapter } from '../../infrastructure/adapters/mongo-document-repository.adapter';
import { PerformanceMonitorAdapter } from '../../infrastructure/adapters/performance-monitor.adapter';
import { PinoLoggerAdapter } from '../../infrastructure/adapters/pino-logger.adapter';
import { DocumentProcessingService } from '../../domain/services/document-processing.service';
import mongoConnection from '../../infrastructure/database/mongo-connection.database';

export class DependencyContainer {
  private documentController?: DocumentController;
  private documentRepository?: MongoDocumentRepositoryAdapter;
  private logger?: PinoLoggerAdapter;
  private processingService?: DocumentProcessingService;

  private getDocumentRepository(): MongoDocumentRepositoryAdapter {
    if (!this.documentRepository) {
      this.documentRepository = new MongoDocumentRepositoryAdapter(mongoConnection);
    }
    return this.documentRepository;
  }

  private getLogger(): PinoLoggerAdapter {
    if (!this.logger) {
      this.logger = new PinoLoggerAdapter();
    }
    return this.logger;
  }

  private getProcessingService(): DocumentProcessingService {
    if (!this.processingService) {
      this.processingService = new DocumentProcessingService();
    }
    return this.processingService;
  }

  public getDocumentController(): DocumentController {
    if (!this.documentController) {
      const repository = this.getDocumentRepository();
      const logger = this.getLogger();
      const processingService = this.getProcessingService();

      const processWithStreamUseCase = new ProcessDocumentsWithStreamUseCase(
        repository,
        new PerformanceMonitorAdapter('stream-processing'),
        logger,
        processingService
      );

      const processWithoutStreamUseCase = new ProcessDocumentsWithoutStreamUseCase(
        repository,
        new PerformanceMonitorAdapter('traditional-processing'),
        logger,
        processingService
      );

      const getStatusUseCase = new GetDocumentStatusUseCase(repository, logger);
      const clearDocumentsUseCase = new ClearDocumentsUseCase(repository, logger);
      const seedDatabaseUseCase = new SeedDatabaseUseCase(
        repository,
        new PerformanceMonitorAdapter('database-seeding'),
        logger
      );

      this.documentController = new DocumentController(
        processWithStreamUseCase,
        processWithoutStreamUseCase,
        getStatusUseCase,
        clearDocumentsUseCase,
        seedDatabaseUseCase
      );
    }
    return this.documentController;
  }
}