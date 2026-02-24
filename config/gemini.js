import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// ATENÇÃO: Se a chave não estiver no Render, o servidor DESLIGA-SE aqui.
if (!process.env.GOOGLE_API_KEY) {
  console.error('❌ ERRO CRÍTICO: GOOGLE_API_KEY não encontrada no .env');
  process.exit(1); // <--- Isto causa o "Failed to Fetch" no frontend se a chave faltar
}

// Inicializa a conexão
export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// O modelo que definiste
export const geminiModelName = 'gemini-3-flash-preview';
