class DocumentDTO {
  constructor({
    id,
    timestamp,
    value,
    category,
    metadata,
    processed = false,
    processedAt = null,
  }) {
    this.id = id;
    this.timestamp = timestamp;
    this.value = value;
    this.category = category;
    this.metadata = metadata;
    this.processed = processed;
    this.processedAt = processedAt;
  }

  static fromDomain(document) {
    return new DocumentDTO({
      id: document.id,
      timestamp: document.timestamp,
      value: document.value,
      category: document.category,
      metadata: document.metadata,
      processed: document.processed,
      processedAt: document.processedAt,
    });
  }

  toDomain() {
    const Document = require("../../domain/entities/Document");
    return new Document({
      id: this.id,
      timestamp: this.timestamp,
      value: this.value,
      category: this.category,
      metadata: this.metadata,
      processed: this.processed,
      processedAt: this.processedAt,
    });
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      value: this.value,
      category: this.category,
      metadata: this.metadata,
      processed: this.processed,
      processedAt: this.processedAt,
    };
  }

  static fromJSON(json) {
    return new DocumentDTO(json);
  }
}

module.exports = DocumentDTO;
