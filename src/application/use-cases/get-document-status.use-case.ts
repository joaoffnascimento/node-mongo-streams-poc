import { DocumentRepository } from '../../domain/ports/document-repository.port';
import { Logger } from '../../domain/ports/logger.port';

export interface DocumentStatusResult {
  status: string;
  database: string;
  documentCount: number;
  environment: string;
}

export class GetDocumentStatusUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly logger: Logger
  ) {}

  public async execute(): Promise<DocumentStatusResult> {
    this.logger.info('Checking document status');

    const documentCount = await this.documentRepository.count();

    this.logger.info('Document status retrieved', { documentCount });

    return {
      status: 'connected',
      database: 'streams-poc',
      documentCount,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
