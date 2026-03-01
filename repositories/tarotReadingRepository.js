import { supabaseAnonClient } from '../config/supabaseClient.js';

export const listRecentTarotReadingsByUserId = async (userId, limit = 10) => {
  const { data, error } = await supabaseAnonClient
    .from('readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};
