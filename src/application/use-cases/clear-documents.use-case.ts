import { DocumentRepository } from '../../domain/ports/document-repository.port';
import { Logger } from '../../domain/ports/logger.port';

export interface ClearDocumentsResult {
  message: string;
  deletedCount: number;
}

export class ClearDocumentsUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly logger: Logger
  ) {}

  public async execute(): Promise<ClearDocumentsResult> {
    this.logger.info('Clearing all documents');

    const result = await this.documentRepository.deleteAll();
    const deletedCount = result.deletedCount || 0;

    this.logger.info('Documents cleared', { deletedCount });

    return {
      message: 'All documents cleared successfully',
      deletedCount,
    };
  }
}
