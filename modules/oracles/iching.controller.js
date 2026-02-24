// modules/oracles/iching.controller.js
import { genAI, geminiModelName } from '../../config/gemini.js';
import { extractJsonFromText } from '../../utils/llmResponse.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';
import { ichingOutputSchema } from '../../shared/validation/iching.schema.js';
import { sendSuccess } from '../../shared/http/response.js';

export const generateIchingReadingData = async (payload) => {
  try {
    const normalizedPayload = {
      ...payload,
      hexagram: payload.hexagram || `Método ${payload.method || 'coins'}`,
    };

    const prompt = `Você é um intérprete do I Ching. Gere uma leitura objetiva e acolhedora em português do Brasil.

ENTRADA (JSON)
${JSON.stringify(normalizedPayload, null, 2)}

REGRAS
- Não use tom fatalista.
- Saída obrigatoriamente em JSON válido (sem markdown).

SAÍDA (JSON EXATO)
{
  "headline": "string (até 90 caracteres)",
  "summary": "string (até 220 caracteres)",
  "themes": ["string", "string", "string"],
  "recommended_actions": ["string", "string", "string"],
  "disclaimer": "Conteúdo para autoconhecimento e reflexão pessoal."
}`;

    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const parsed = extractJsonFromText(rawText);
    return ichingOutputSchema.parse(parsed);
  } catch (error) {
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      throw new AppError('Serviço de IA indisponível na localização configurada.', {
        code: ERROR_CODES.LLM_LOCATION_UNSUPPORTED,
        status: 503,
      });
    }
    throw new AppError('Falha ao gerar leitura de I Ching.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 500,
      details: error?.issues || [error?.message],
    });
  }
};

export const createIchingReading = async (req, res, next) => {
  try {
    const data = await generateIchingReadingData(req.body);
    return sendSuccess(res, { data, requestId: req.requestId, status: 200 });
  } catch (error) {
    return next(error);
  }
};
