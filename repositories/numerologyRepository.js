import { supabaseAnonClient } from '../config/supabaseClient.js';

export const getLatestNumerologyByUserId = async (userId) => {
  const { data, error } = await supabaseAnonClient
    .from('numerology_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};
