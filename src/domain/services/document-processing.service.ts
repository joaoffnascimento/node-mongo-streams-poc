import { Document } from '../entities/document.entity';

export class DocumentProcessingService {
  public processDocument(document: Document): Document {
    return document.process();
  }

  public performHeavyProcessing(document: Document): Document {
    const processed = document.process();
    
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(processed.value.getValue() * i);
    }

    const heavyData = new Array(100).fill(0).map((_, i) => ({
      index: i,
      value: Math.random() * 1000,
      timestamp: new Date(),
      data: `Heavy processing data ${i}`.repeat(10),
    }));

    return new Document({
      ...processed.toJSON(),
      metadata: {
        ...processed.metadata,
        heavyData,
      },
    });
  }
}