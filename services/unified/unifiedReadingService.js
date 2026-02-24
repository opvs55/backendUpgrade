import { getUnifiedReadingByIdForUser, listUnifiedReadingsByUser } from '../../repositories/unifiedReadingRepository.js';

export const listMyUnifiedReadings = async (userId, { limit = 20, offset = 0 }) => {
  return listUnifiedReadingsByUser(userId, limit, offset);
};

export const getMyUnifiedReadingById = async (userId, id) => getUnifiedReadingByIdForUser(id, userId);
