class Document {
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

  process() {
    return new Document({
      ...this,
      processed: true,
      processedAt: new Date(),
      metadata: {
        ...this.metadata,
        processedValue: this.value * 2,
        squared: this.value ** 2,
        sqrt: Math.sqrt(this.value),
      },
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
}

module.exports = Document;
