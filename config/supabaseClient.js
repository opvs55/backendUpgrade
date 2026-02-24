// config/supabaseClient.js (COM FUNÇÃO PARA CLIENTE POR REQUISIÇÃO)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config(); // Carrega as variáveis do .env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Verifica se as variáveis foram carregadas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro Crítico: Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não definidas no backend.");
  // É importante interromper ou lidar com isso, pois a aplicação não funcionará
  process.exit(1); // Interrompe o servidor se as chaves estiverem em falta
}

// (Opcional) Cliente Anônimo Base: Para operações que não precisam de RLS ou autenticação
// Pode ser útil para buscar dados públicos gerais, se houver.
export const supabaseAnonClient = createClient(supabaseUrl, supabaseAnonKey);

// --- FUNÇÃO PRINCIPAL PARA CRIAR CLIENTES AUTENTICADOS ---
// Recebe o token JWT e retorna um novo cliente Supabase configurado com esse token
export const createSupabaseServerClient = (jwt) => {
  if (!jwt) {
    console.error("createSupabaseServerClient: Tentativa de criar cliente sem JWT.");
    // Retorna o cliente anônimo ou lança um erro, dependendo da sua necessidade
    // Lançar um erro é geralmente mais seguro se a operação EXIGE autenticação.
    throw new Error("Token JWT é necessário para criar um cliente autenticado.");
    // return supabaseAnonClient; // Alternativa menos segura
  }

  // Cria um NOVO cliente Supabase específico para esta requisição,
  // passando o token JWT nas opções globais. O Supabase usará este token
  // para todas as chamadas feitas por este cliente, permitindo que RLS funcione.
  const supabaseServerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
     // auth: { // Opcional: Desabilitar persistência no lado do servidor
     //   persistSession: false,
     //   autoRefreshToken: false,
     // }
  });

  console.log("[SupabaseClient] Cliente autenticado criado para a requisição.");
  return supabaseServerClient;
};

// Exporta a URL e a Chave Anon também, caso sejam necessárias noutros locais (raro)
export { supabaseUrl, supabaseAnonKey };
