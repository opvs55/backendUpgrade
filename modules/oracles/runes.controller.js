// modules/oracles/runes.controller.js
import { genAI, geminiModelName } from '../../config/gemini.js';
import { extractJsonFromText } from '../../utils/llmResponse.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';
import { runesOutputSchema } from '../../shared/validation/runes.schema.js';
const buildRunesList = (payload) => {
  if (Array.isArray(payload.runes) && payload.runes.length) {
    return payload.runes;
  }
  const count = payload.drawCount || 3;
  return Array.from({ length: count }, (_, index) => `Runa ${index + 1}`);
};

export const generateRunesReadingData = async (payload) => {
  if (!genAI) {
    throw new AppError('Serviço de IA temporariamente indisponível. Configure a API key do provedor.', {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      status: 503,
    });
  }
  try {
    const normalizedPayload = {
      ...payload,
      runes: buildRunesList(payload),
    };

    const prompt = `Você é um intérprete de runas. Gere uma leitura objetiva e acolhedora em português do Brasil.

ENTRADA (JSON)
${JSON.stringify(normalizedPayload, null, 2)}

REGRAS
- Não use tom fatalista.
- Saída obrigatoriamente em JSON válido (sem markdown).

SAÍDA (JSON EXATO)
{
  "headline": "string (até 90 caracteres)",
  "summary": "string (até 220 caracteres)",
  "one_liner": "string (1 frase forte)",
  "ritual": "string (2-3 frases práticas)",
  "reflection_question": "string (1 pergunta)",
  "themes": ["string", "string", "string"],
  "recommended_actions": ["string", "string", "string"],
  "disclaimer": "Conteúdo para autoconhecimento e reflexão pessoal."
}`;

    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const parsed = extractJsonFromText(rawText);
    return runesOutputSchema.parse(parsed);
  } catch (error) {
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      throw new AppError('Serviço de IA indisponível na localização configurada.', {
        code: ERROR_CODES.LLM_LOCATION_UNSUPPORTED,
        status: 503,
      });
    }
    throw new AppError('Falha ao gerar leitura de runas.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 500,
      details: error?.issues || [error?.message],
    });
  }
};
