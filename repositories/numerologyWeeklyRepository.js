import { supabaseAnonClient, supabaseUserClient } from '../config/supabaseClient.js';

const getClient = (accessToken) => (accessToken ? supabaseUserClient(accessToken) : supabaseAnonClient);

export const getNumerologyWeeklyByUserAndWeekStart = async (userId, weekStart, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('numerology_weekly_readings')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const UPSERT_COLUMNS = ['user_id', 'week_start', 'week_ref', 'result_payload', 'input_payload', 'updated_at'];

const sanitizeWeeklyPayload = (payload = {}) =>
  UPSERT_COLUMNS.reduce((acc, column) => {
    if (Object.hasOwn(payload, column) && payload[column] !== undefined) {
      acc[column] = payload[column];
    }
    return acc;
  }, {});

export const upsertNumerologyWeeklyReading = async (payload, accessToken) => {
  const sanitized = sanitizeWeeklyPayload(payload);
  const { data, error } = await getClient(accessToken)
    .from('numerology_weekly_readings')
    .upsert(sanitized, { onConflict: 'user_id,week_start' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};
