import { AppError } from '../shared/http/AppError.js';
import { ERROR_CODES } from '../shared/http/errorCodes.js';
import { supabaseUserClient } from '../config/supabaseClient.js';
import { logger } from '../shared/logging/logger.js';

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

// Mesmo tratamento de oracleWeeklyModuleRepository.js: detalhe do erro do
// Postgrest fica só no log do servidor; o código cru vai anexado como
// pgCode (não enviado ao cliente) pra quem chama poder checar corridas.
const buildSupabaseError = (operation, error) => {
  const code = error?.code || 'SUPABASE_UNKNOWN';
  const message = error?.message || 'Erro desconhecido ao acessar journal_entries.';

  logger.error('journal_entry.supabase_error', { operation, code, message });

  const appError = new AppError('Falha ao acessar suas memórias.', {
    code: ERROR_CODES.INTERNAL_ERROR,
    status: 500,
  });
  appError.pgCode = code;
  return appError;
};

const JOURNAL_ENTRY_COLUMNS = 'id, user_id, content, reflection_card_name, reflection_message, created_at, updated_at';

export const listJournalEntries = async (userId, { limit = 10, offset = 0 } = {}, accessToken) => {
  const { data, error, count } = await getClient(accessToken)
    .from('journal_entries')
    .select(JOURNAL_ENTRY_COLUMNS, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw buildSupabaseError('select', error);
  return { data: data || [], count: count || 0 };
};

export const createJournalEntry = async ({ userId, content }, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('journal_entries')
    .insert({ user_id: userId, content })
    .select(JOURNAL_ENTRY_COLUMNS)
    .single();

  if (error) throw buildSupabaseError('insert', error);
  return data;
};

export const updateJournalEntryReflection = async (id, userId, { reflectionCardName, reflectionMessage }, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('journal_entries')
    .update({ reflection_card_name: reflectionCardName, reflection_message: reflectionMessage })
    .eq('id', id)
    .eq('user_id', userId)
    .select(JOURNAL_ENTRY_COLUMNS)
    .single();

  if (error) throw buildSupabaseError('update', error);
  return data;
};

export const getJournalEntryById = async (id, userId, accessToken) => {
  const { data, error } = await getClient(accessToken)
    .from('journal_entries')
    .select(JOURNAL_ENTRY_COLUMNS)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw buildSupabaseError('select', error);
  return data;
};

export const deleteJournalEntryById = async (id, userId, accessToken) => {
  const { error } = await getClient(accessToken)
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw buildSupabaseError('delete', error);
};
