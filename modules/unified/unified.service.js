// modules/unified/unified.service.js
import crypto from 'crypto';
import { genAI, geminiModelName } from '../../config/gemini.js';
import { extractJsonFromText } from '../../utils/llmResponse.js';
import { withTimeout } from '../../shared/async/withTimeout.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';
import { generateNatalChartData } from '../astrology/natalChart.controller.js';
import { generateRunesReadingData } from '../oracles/runes.controller.js';
import { generateIchingReadingData } from '../oracles/iching.controller.js';
import { parseNormalizedOutput, parseUnifiedOutput } from './unified.schema.js';
import { getUnifiedReadingsRepository } from './unified.repository.js';

const repository = getUnifiedReadingsRepository();
const MODULE_TIMEOUT_MS = Number(process.env.UNIFIED_MODULE_TIMEOUT_MS || 8000);

const normalizeNatal = (data) => ({
  themes: [data.headline, data.summary].filter(Boolean),
  risk_flags: data.challenges || [],
  strength_flags: data.strengths || [],
  recommended_actions: data.guidance ? [data.guidance] : [],
});

const normalizeGeneric = (data) => ({
  themes: data.themes || [],
  risk_flags: [],
  strength_flags: [],
  recommended_actions: data.recommended_actions || [],
});

const normalizeModule = (module, data) => {
  if (!data) {
    return parseNormalizedOutput({ themes: [], risk_flags: [], strength_flags: [], recommended_actions: [] });
  }
  return parseNormalizedOutput(module === 'natal' ? normalizeNatal(data) : normalizeGeneric(data));
};

const warningFromError = (module, error) => ({
  module,
  code: error?.code || ERROR_CODES.MODULE_FAILURE,
  message: error?.message || 'Falha no módulo.',
  recoverable: true,
});

const synthesizeFinal = async (normalized, warnings) => {
  try {
    const prompt = `Você é um motor de síntese de oráculos. Retorne JSON válido.
ENTRADA:
${JSON.stringify({ normalized, warnings }, null, 2)}
SAÍDA EXATA:
{
  "headline": "string",
  "essence": "string",
  "main_strength": "string",
  "attention_point": "string",
  "daily_action": "string",
  "micro_actions": ["string", "string", "string"],
  "integrated_reading": "string",
  "disclaimer": "Conteúdo para autoconhecimento e reflexão pessoal."
}`;

    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonFromText(result.response.text());
    return parseUnifiedOutput(parsed);
  } catch (error) {
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      throw new AppError('Serviço de IA indisponível na localização configurada.', {
        code: ERROR_CODES.LLM_LOCATION_UNSUPPORTED,
        status: 503,
      });
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Falha na síntese final.', {
      code: ERROR_CODES.INTERNAL_ERROR,
      status: 500,
      details: [error?.message],
    });
  }
};

export const createUnifiedReading = async ({ payload }) => {
  const tasks = [
    ['natal', () => withTimeout(generateNatalChartData(payload.natalInput), MODULE_TIMEOUT_MS, 'natal')],
    ['runes', () => withTimeout(generateRunesReadingData(payload.runesInput), MODULE_TIMEOUT_MS, 'runes')],
    ['iching', () => withTimeout(generateIchingReadingData(payload.ichingInput), MODULE_TIMEOUT_MS, 'iching')],
  ];

  const executed = await Promise.allSettled(
    tasks.map(([_, execute]) => execute())
  );

  const modules = {};
  const warnings = [];

  executed.forEach((result, index) => {
    const moduleName = tasks[index][0];
    if (result.status === 'fulfilled') {
      modules[moduleName] = result.value;
    } else {
      modules[moduleName] = null;
      warnings.push(warningFromError(moduleName, result.reason));
    }
  });

  const normalized = {
    natal: normalizeModule('natal', modules.natal),
    runes: normalizeModule('runes', modules.runes),
    iching: normalizeModule('iching', modules.iching),
  };

  const synthesis = await synthesizeFinal(normalized, warnings);
  const id = crypto.randomUUID();

  const record = {
    id,
    created_at: new Date().toISOString(),
    payload,
    warnings,
    modules,
    result: synthesis,
  };

  await repository.create(record);

  return {
    id,
    warnings,
    result: synthesis,
  };
};

export const getUnifiedReadingById = async (id) => repository.findById(id);
