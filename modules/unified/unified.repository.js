// modules/unified/unified.repository.js
import { InMemoryUnifiedReadingsRepository } from './repositories/inMemoryRepository.js';
import { SqlUnifiedReadingsRepository } from './repositories/sqlRepository.js';
import { logger } from '../../shared/logging/logger.js';

let repositoryInstance;

export const getUnifiedReadingsRepository = () => {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  const connectionString = process.env.UNIFIED_DB_URL || process.env.DATABASE_URL;
  if (connectionString) {
    repositoryInstance = new SqlUnifiedReadingsRepository(connectionString);
    return repositoryInstance;
  }

  logger.warn('Unified repository em memória (DB não configurado).');
  repositoryInstance = new InMemoryUnifiedReadingsRepository();
  return repositoryInstance;
};
