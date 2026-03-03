import { AppError } from '../shared/http/AppError.js';
import { ERROR_CODES } from '../shared/http/errorCodes.js';
import { supabaseUserClient } from '../config/supabaseClient.js';

const buildSupabaseError = (operation, error) => {
  const code = error?.code || 'SUPABASE_UNKNOWN';
  const message = error?.message || 'Erro desconhecido ao acessar oracle_weekly_modules.';

  return new AppError(`Falha no Supabase (${operation}) [${code}]: ${message}`, {
    code: ERROR_CODES.INTERNAL_ERROR,
    status: 500,
    details: [{ operation, code, message }],
  });
};

const getClient = (accessToken) => {
  try {
    return supabaseUserClient(accessToken);
  } catch (error) {
    throw new AppError(error.message, {
      code: ERROR_CODES.AUTH_REQUIRED,
      status: 401,
      details: [{ code: 'MISSING_ACCESS_TOKEN', message: 'Bearer token não disponível para o cliente Supabase.' }],
    });
  }
};

export const getWeeklyModule = async (userId, weekStart, oracleType, accessToken) => {
  const client = getClient(accessToken);

  const { data, error } = await client
    .from('oracle_weekly_modules')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('oracle_type', oracleType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw buildSupabaseError('select', error);
  return data;
};

export const getOracleWeeklyModule = getWeeklyModule;

export const saveOracleWeeklyModule = async (payload, accessToken) => {
  const client = getClient(accessToken);

  const { data, error } = await client
    .from('oracle_weekly_modules')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw buildSupabaseError('insert', error);
  return data;
};

export const updateOracleWeeklyModuleById = async (id, payload, accessToken) => {
  const client = getClient(accessToken);

  const { data, error } = await client
    .from('oracle_weekly_modules')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw buildSupabaseError('update', error);
  return data;
};
