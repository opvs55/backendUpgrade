import { getUnifiedReadingByIdForUser, listUnifiedReadingsByUser } from '../../repositories/unifiedReadingRepository.js';

export const listMyUnifiedReadings = async (userId, { limit = 20, offset = 0 }, accessToken) => {
  return listUnifiedReadingsByUser(userId, limit, offset, accessToken);
};

export const getMyUnifiedReadingById = async (userId, id, accessToken) =>
  getUnifiedReadingByIdForUser(id, userId, accessToken);
