// modules/unified/repositories/inMemoryRepository.js
export class InMemoryUnifiedReadingsRepository {
  constructor() {
    this.store = new Map();
  }

  async create(record) {
    this.store.set(record.id, record);
    return record;
  }

  async findById(id) {
    return this.store.get(id) || null;
  }
}
