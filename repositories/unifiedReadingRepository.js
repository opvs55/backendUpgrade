import { supabaseAnonClient, supabaseUserClient } from '../config/supabaseClient.js';

const getClient = (accessToken) => (accessToken ? supabaseUserClient(accessToken) : supabaseAnonClient);

const UNIFIED_READING_COLUMNS = [
  'user_id',
  'week_start',
  'week_ref',
  'focus_area',
  'question',
  'inputs_snapshot',
  'modules_snapshot',
  'final_reading',
  'energy_score',
  'tags',
  'created_at',
  'updated_at',
];

const sanitizeUnifiedReadingPayload = (payload = {}) =>
  UNIFIED_READING_COLUMNS.reduce((acc, column) => {
    if (Object.hasOwn(payload, column) && payload[column] !== undefined) {
      acc[column] = payload[column];
    }
    return acc;
  }, {});

export const createUnifiedReading = async (payload, accessToken) => {
  const sanitizedPayload = sanitizeUnifiedReadingPayload(payload);
  const { data, error } = await getClient(accessToken)
    .from('unified_readings')
    .insert(sanitizedPayload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const updateUnifiedReadingById = async (id, payload, accessToken) => {
  const sanitizedPayload = sanitizeUnifiedReadingPayload(payload);
  const { data, error } = await getClient(accessToken)
    .from('unified_readings')
    .update(sanitizedPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const upsertUnifiedReading = async (payload, accessToken) => {
  const sanitizedPayload = sanitizeUnifiedReadingPayload(payload);
  const { data, error } = await getClient(accessToken)
    .from('unified_readings')
    .upsert(sanitizedPayload, { onConflict: 'user_id,week_start' })
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
