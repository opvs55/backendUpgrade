import { supabaseAnonClient } from '../config/supabaseClient.js';

export const getOracleWeeklyModule = async (userId, weekStart, oracleType) => {
  const { data, error } = await supabaseAnonClient
    .from('oracle_weekly_modules')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('oracle_type', oracleType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const saveOracleWeeklyModule = async (payload) => {
  const { data, error } = await supabaseAnonClient
    .from('oracle_weekly_modules')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const updateOracleWeeklyModuleById = async (id, payload) => {
  const { data, error } = await supabaseAnonClient
    .from('oracle_weekly_modules')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};
