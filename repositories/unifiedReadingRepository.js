import { supabaseAnonClient } from '../config/supabaseClient.js';

export const createUnifiedReading = async (payload) => {
  const { data, error } = await supabaseAnonClient
    .from('unified_readings')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const listUnifiedReadingsByUser = async (userId, limit = 20, offset = 0) => {
  const { data, error } = await supabaseAnonClient
    .from('unified_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
};

export const getUnifiedReadingByIdForUser = async (id, userId) => {
  const { data, error } = await supabaseAnonClient
    .from('unified_readings')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};
