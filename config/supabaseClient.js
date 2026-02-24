import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  // Mantém o backend vivo para rotas com fallback.
  console.warn('[Supabase] SUPABASE_URL/SUPABASE_ANON_KEY ausentes. Operações de DB podem falhar.');
}

export const supabaseAnonClient = createClient(env.supabaseUrl || 'http://localhost', env.supabaseAnonKey || 'public-anon-key');

export const createSupabaseServerClient = (jwt) => {
  if (!jwt) {
    throw new Error('Token JWT é necessário para criar cliente autenticado.');
  }

  return createClient(env.supabaseUrl || 'http://localhost', env.supabaseAnonKey || 'public-anon-key', {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
  });
};
