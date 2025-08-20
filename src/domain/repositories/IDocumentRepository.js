class IDocumentRepository {
  async findAll() {
    throw new Error("Method not implemented");
  }

  async findAllStream() {
    throw new Error("Method not implemented");
  }

  async count() {
    throw new Error("Method not implemented");
  }

  async insertMany(documents) {
    throw new Error("Method not implemented");
  }

  async insertStream() {
    throw new Error("Method not implemented");
  }

  async deleteAll() {
    throw new Error("Method not implemented");
  }
}

module.exports = IDocumentRepository;
