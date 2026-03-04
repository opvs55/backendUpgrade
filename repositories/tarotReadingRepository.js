import { supabaseAnonClient, supabaseUserClient } from '../config/supabaseClient.js';

const getClient = (accessToken) => (accessToken ? supabaseUserClient(accessToken) : supabaseAnonClient);

export const listRecentTarotReadingsByUserId = async (userId, limit = 10, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};
