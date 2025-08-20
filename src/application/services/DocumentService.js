class DocumentService {
  constructor(documentRepository) {
    this.repository = documentRepository;
  }

  async getDocumentCount() {
    return await this.repository.count();
  }

  async processAllDocuments() {
    return await this.repository.findAll();
  }

  async processDocumentsStream() {
    return await this.repository.findAllStream();
  }

  async clearAllDocuments() {
    return await this.repository.deleteAll();
  }

  async seedDocuments(documents) {
    return await this.repository.insertMany(documents);
  }

  createDocumentInsertStream(options) {
    return this.repository.createInsertStream(options);
  }
}

module.exports = DocumentService;
