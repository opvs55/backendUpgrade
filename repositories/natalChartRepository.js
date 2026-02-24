import { supabaseAnonClient } from '../config/supabaseClient.js';

export const getNatalChartByUserId = async (userId) => {
  const { data, error } = await supabaseAnonClient
    .from('natal_charts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertNatalChartByUserId = async (userId, payload) => {
  const dataToSave = { user_id: userId, ...payload };
  const { data, error } = await supabaseAnonClient
    .from('natal_charts')
    .upsert(dataToSave, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};
