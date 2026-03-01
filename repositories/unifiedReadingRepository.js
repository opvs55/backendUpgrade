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

export const updateUnifiedReadingById = async (id, payload) => {
  const { data, error } = await supabaseAnonClient
    .from('unified_readings')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const getUnifiedReadingByUserAndWeekStart = async (userId, weekStart) => {
  const { data, error } = await supabaseAnonClient
    .from('unified_readings')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

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
