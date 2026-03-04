import { supabaseAnonClient, supabaseUserClient } from '../config/supabaseClient.js';

const getClient = (accessToken) => (accessToken ? supabaseUserClient(accessToken) : supabaseAnonClient);

export const getProfileById = async (userId, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertProfileById = async (userId, payload, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('profiles')
    .upsert({ id: userId, ...payload }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};
