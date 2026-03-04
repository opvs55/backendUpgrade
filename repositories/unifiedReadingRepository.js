import { supabaseAnonClient, supabaseUserClient } from '../config/supabaseClient.js';

const getClient = (accessToken) => (accessToken ? supabaseUserClient(accessToken) : supabaseAnonClient);

export const createUnifiedReading = async (payload, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('unified_readings')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const updateUnifiedReadingById = async (id, payload, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('unified_readings')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const upsertUnifiedReading = async (payload, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('unified_readings')
    .upsert(payload, { onConflict: 'user_id,week_start' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const getUnifiedReadingByUserAndWeekStart = async (userId, weekStart, accessToken) => {
  const { data, error } = await getClient(accessToken)
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

export const listUnifiedReadingsByUser = async (userId, limit = 20, offset = 0, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('unified_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
};

export const getUnifiedReadingByIdForUser = async (id, userId, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('unified_readings')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};
