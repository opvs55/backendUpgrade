import { genAI, geminiModelName } from '../../config/gemini.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';

const fallbackReading = () => ({
  title: 'Oráculo Central da Semana',
  one_liner: 'Uma semana de alinhamento: foco, simplicidade e decisões com propósito.',
  overview: 'O momento favorece estabilidade emocional e ação consistente. Menos pressa, mais direção.',
  signals: [
    'Observe padrões que se repetem nas suas escolhas recentes.',
    'Priorize o que fortalece sua energia em vez do que apenas ocupa tempo.',
    'Converse com clareza antes de assumir novos compromissos.',
  ],
  synthesis: 'Quando você une intuição com rotina prática, a semana flui com menos ruído e mais resultado.',
  practical_guidance: [
    'Defina 1 prioridade principal para a semana.',
    'Reserve um bloco diário curto para revisão emocional e foco.',
    'Feche ciclos pendentes antes de abrir novos.',
  ],
  closing: 'Confie no seu ritmo: consistência silenciosa é a sua força agora.',
  tags: ['oraculo-central', 'semana', 'clareza', 'equilibrio'],
  energy_score: 74,
});

const sanitizeReading = (value = {}) => {
  const fallback = fallbackReading();
  return {
    title: value.title || fallback.title,
    one_liner: value.one_liner || fallback.one_liner,
    overview: value.overview || fallback.overview,
    signals: Array.isArray(value.signals) ? value.signals.slice(0, 6) : fallback.signals,
    synthesis: value.synthesis || fallback.synthesis,
    practical_guidance: Array.isArray(value.practical_guidance) ? value.practical_guidance.slice(0, 6) : fallback.practical_guidance,
    closing: value.closing || fallback.closing,
    tags: Array.isArray(value.tags) ? value.tags.slice(0, 10) : fallback.tags,
    energy_score: Number.isFinite(Number(value.energy_score)) ? Math.max(0, Math.min(100, Number(value.energy_score))) : fallback.energy_score,
  };
};

export const generateSynthesis = async ({ context }) => {
  if (!genAI) {
    throw new AppError('Não foi possível gerar a Leitura Geral agora. Tente novamente em instantes.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 502,
      details: [{ stage: 'call gemini', reason: 'GEN_AI_NOT_CONFIGURED' }],
    });
  }

  const prompt = `Você é um oráculo sábio e detalhista em português brasileiro.
Com base no contexto abaixo, produza uma leitura semanal integrando tarot, numerologia, runas, i ching e padrões recentes.
Tom: acolhedor, claro, prático, sem fatalismo.
Se algum sinal estiver ausente no contexto, escreva literalmente "Sinal ausente nesta semana" e continue com os demais sinais disponíveis.
Nunca invente cartas, leituras ou dados não fornecidos no contexto.
Não mencione tecnologia, API, JSON, backend, banco de dados, módulos ou regras internas.
Retorne APENAS um JSON válido no formato:
{
  "title": "string",
  "one_liner": "string",
  "overview": "string",
  "signals": ["string"],
  "synthesis": "string",
  "practical_guidance": ["string"],
  "closing": "string",
  "tags": ["string"],
  "energy_score": 0
}
Contexto: ${JSON.stringify(context)}`;

  try {
    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error('JSON ausente');
    }

    return sanitizeReading(JSON.parse(text.slice(start, end + 1)));
  } catch (error) {
    throw new AppError('Não foi possível gerar a Leitura Geral agora. Tente novamente em instantes.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 502,
      details: [{ stage: 'call gemini', reason: error?.message || 'UNKNOWN_GEMINI_ERROR' }],
    });
  }
};
