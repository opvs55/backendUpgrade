import { genAI, geminiModelName } from '../../config/gemini.js';
import { generateWithRetry } from '../../utils/geminiRetry.js';
import { extractJsonFromText } from '../../utils/llmResponse.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';

// Carta sorteada no cliente (sortearUmaCarta) — isso só gera a mensagem que
// conecta a carta com o que a pessoa escreveu no diário.
export const generateJournalReflectionReading = async ({ cardName, reflectionText }) => {
  if (!genAI) {
    throw new AppError('Serviço de IA temporariamente indisponível. Configure a API key do provedor.', {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      status: 503,
    });
  }

  const prompt = `Você é uma taróloga brasileira. Uma pessoa escreveu esta reflexão no diário dela:

"${reflectionText}"

A carta sorteada em resposta a essa reflexão foi "${cardName}".

DIREÇÃO DE TOM: escreva com voz direta e confiante. Frases afirmativas, nada de "talvez" ou "pode ser". Sem fatalismo.

Responda em JSON exato, sem markdown, com este campo:
{
  "mensagem": "Mensagem curta (2-4 frases) em português conectando a carta sorteada com o que a pessoa escreveu, sem repetir o texto dela e sem mencionar o nome da carta explicitamente."
}
Responda APENAS o JSON.`;

  const model = genAI.getGenerativeModel({ model: geminiModelName });
  const result = await generateWithRetry(model, prompt);
  const parsed = extractJsonFromText(result.response.text());

  if (!parsed?.mensagem) {
    throw new AppError('Não foi possível gerar a leitura da reflexão.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 502,
    });
  }

  return { mensagem: parsed.mensagem };
};
