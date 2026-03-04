import { supabaseAnonClient, supabaseUserClient } from '../config/supabaseClient.js';

const getClient = (accessToken) => (accessToken ? supabaseUserClient(accessToken) : supabaseAnonClient);

export const getLatestNumerologyByUserId = async (userId, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('numerology_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getLatestNumerologyWeeklyByUserId = async (userId, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('numerology_weekly_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};
