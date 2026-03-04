import { supabaseAnonClient, supabaseUserClient } from '../config/supabaseClient.js';

const getClient = (accessToken) => (accessToken ? supabaseUserClient(accessToken) : supabaseAnonClient);

export const getWeeklyCardByUserAndWeekRef = async (userId, weekRef, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('weekly_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('week_ref', weekRef)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getWeeklyCardByUserAndWeekStart = async (userId, weekStart, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('weekly_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};
