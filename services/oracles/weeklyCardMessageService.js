import { genAI, geminiModelName } from '../../config/gemini.js';
import { generateWithRetry } from '../../utils/geminiRetry.js';
import { extractJsonFromText } from '../../utils/llmResponse.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';

// Carta da Semana é sorteada no frontend (sem IA) — isso só cobre a
// mensagem curta que dá profundidade a ela, gerada uma vez e persistida
// pelo frontend em weekly_cards.metadata.
export const generateWeeklyCardMessage = async ({ cardName }) => {
  if (!genAI) {
    throw new AppError('Serviço de IA temporariamente indisponível. Configure a API key do provedor.', {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      status: 503,
    });
  }

  const prompt = `Você é uma taróloga brasileira. A carta da semana de alguém é "${cardName}".

DIREÇÃO DE TOM: escreva com voz direta e confiante. Frases afirmativas, nada de "talvez" ou "pode ser". Sem fatalismo.

Responda em JSON exato, sem markdown, com este campo:
{
  "mensagem": "Mensagem curta (2-3 frases) em português orientando a semana da pessoa a partir dessa carta, sem mencionar o nome da carta explicitamente."
}
Responda APENAS o JSON.`;

  const model = genAI.getGenerativeModel({ model: geminiModelName });
  const result = await generateWithRetry(model, prompt);
  const parsed = extractJsonFromText(result.response.text());

  if (!parsed?.mensagem) {
    throw new AppError('Não foi possível gerar a mensagem da semana.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 502,
    });
  }

  return { mensagem: parsed.mensagem };
};
