import { supabaseAnonClient } from '../config/supabaseClient.js';

export const getNumerologyWeeklyByUserAndWeekStart = async (userId, weekStart) => {
  const { data, error } = await supabaseAnonClient
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
