import { supabaseAnonClient } from '../config/supabaseClient.js';

export const getProfileById = async (userId) => {
  const { data, error } = await supabaseAnonClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertProfileById = async (userId, payload) => {
  const { data, error } = await supabaseAnonClient
    .from('profiles')
    .upsert({ id: userId, ...payload }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};
