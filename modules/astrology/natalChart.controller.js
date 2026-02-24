// modules/astrology/natalChart.controller.js
import { genAI, geminiModelName } from '../../config/gemini.js';
import { extractJsonFromText } from '../../utils/llmResponse.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';
import { natalChartOutputSchema } from '../../shared/validation/natalChart.schema.js';
import { sendSuccess } from '../../shared/http/response.js';

export const generateNatalChartData = async (payload) => {
  try {
    const prompt = `Você é um intérprete de mapa natal simplificado. Gere uma leitura breve e acolhedora em português do Brasil.

ENTRADA (JSON)
${JSON.stringify(payload, null, 2)}

REGRAS
- Não invente dados que não estejam no payload.
- Não use tom fatalista.
- Saída obrigatoriamente em JSON válido (sem markdown).

SAÍDA (JSON EXATO)
{
  "headline": "string (até 90 caracteres)",
  "summary": "string (até 220 caracteres)",
  "strengths": ["string", "string", "string"],
  "challenges": ["string", "string", "string"],
  "guidance": "string (até 240 caracteres)",
  "disclaimer": "Conteúdo para autoconhecimento e reflexão pessoal."
}`;

    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const parsed = extractJsonFromText(rawText);
    return natalChartOutputSchema.parse(parsed);
  } catch (error) {
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      throw new AppError('Serviço de IA indisponível na localização configurada.', {
        code: ERROR_CODES.LLM_LOCATION_UNSUPPORTED,
        status: 503,
      });
    }
    throw new AppError('Falha ao gerar leitura natal.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 500,
      details: error?.issues || [error?.message],
    });
  }
};

export const createNatalChartReading = async (req, res, next) => {
  try {
    const data = await generateNatalChartData(req.body);
    return sendSuccess(res, { data, requestId: req.requestId, status: 200 });
  } catch (error) {
    return next(error);
  }
};
