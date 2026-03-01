import { supabaseAnonClient } from '../config/supabaseClient.js';

export const getWeeklyCardByUserAndWeekRef = async (userId, weekRef) => {
  const { data, error } = await supabaseAnonClient
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

export const getWeeklyCardByUserAndWeekStart = async (userId, weekStart) => {
  const { data, error } = await supabaseAnonClient
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
