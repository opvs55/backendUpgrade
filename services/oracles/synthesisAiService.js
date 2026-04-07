import { genAI, geminiModelName } from '../../config/gemini.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';
import { normalizeCentralFinalReading } from '../../shared/http/centralReadingContract.js';

const fallbackReading = () => ({
  title: 'Leitura Geral Semanal',
  one_liner: 'Uma semana de alinhamento entre clareza emocional e ação prática.',
  overview: [
    'O momento favorece estabilidade emocional e ação consistente.',
    'Com foco no essencial, as decisões ganham direção e menos ruído.',
  ],
  signals: {
    tarot: 'Observe padrões que se repetem nas suas escolhas recentes.',
    runes: 'Priorize o que fortalece sua energia em vez do que apenas ocupa tempo.',
    i_ching: 'Ajustes graduais e consistentes destravam movimentos importantes.',
    numerology: 'Energia favorável para disciplina com flexibilidade.',
  },
  synthesis: {
    convergences: ['Clareza antes de agir.', 'Constância supera pressa.'],
    tensions: ['Evitar excesso de tarefas simultâneas.'],
    theme_of_week: 'Foco com equilíbrio',
    hidden_lesson: 'Pequenos ajustes diários acumulam resultados duradouros.',
  },
  practical_guidance: {
    do: ['Defina 1 prioridade principal para a semana.'],
    avoid: ['Evite abrir novos ciclos antes de concluir pendências críticas.'],
    ritual: 'Reserve um bloco diário curto para revisão emocional e foco.',
    reflection_question: 'Qual ação simples hoje protege o que é essencial para mim?',
  },
  closing: 'Confie no seu ritmo: consistência silenciosa é a sua força agora.',
  tags: ['oraculo-central', 'semana', 'clareza', 'equilibrio'],
  energy_score: 74,
});

const sanitizeReading = (value = {}) => normalizeCentralFinalReading(value, {
  fallbackSignals: fallbackReading().signals,
});

export const generateSynthesis = async ({ context }) => {
  if (!genAI) {
    throw new AppError('Não foi possível gerar a Leitura Geral agora. Tente novamente em instantes.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 502,
      details: [{ stage: 'call gemini', reason: 'GEN_AI_NOT_CONFIGURED' }],
    });
  }

  const prompt = `Você é um oráculo sábio e detalhista em português brasileiro.
Com base no contexto abaixo, produza uma leitura semanal integrando tarot, numerologia, runas e i ching.
Tom: acolhedor, claro, prático, sem fatalismo.
A leitura deve funcionar apenas com os módulos disponíveis no contexto atual desta semana; não dependa de histórico de leituras anteriores.
Se algum sinal estiver ausente no contexto, escreva literalmente "Sinal ausente nesta semana" e continue com os demais sinais disponíveis.
Nunca invente cartas, leituras ou dados não fornecidos no contexto.
Não mencione tecnologia, API, JSON, backend, banco de dados, módulos ou regras internas.
Retorne APENAS um JSON válido no formato:
{
  "title": "string",
  "one_liner": "string",
  "overview": ["parágrafo 1", "parágrafo 2"],
  "signals": {
    "tarot": "string",
    "runes": "string",
    "i_ching": "string",
    "numerology": "string"
  },
  "synthesis": {
    "convergences": ["string"],
    "tensions": ["string"],
    "theme_of_week": "string",
    "hidden_lesson": "string"
  },
  "practical_guidance": {
    "do": ["string"],
    "avoid": ["string"],
    "ritual": "string",
    "reflection_question": "string"
  },
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
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      throw new AppError('Serviço de IA indisponível na localização configurada.', {
        code: ERROR_CODES.LLM_LOCATION_UNSUPPORTED,
        status: 503,
      });
    }
    throw new AppError('Não foi possível gerar a Leitura Geral agora. Tente novamente em instantes.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 502,
      details: [{ stage: 'call gemini', reason: error?.message || 'UNKNOWN_GEMINI_ERROR' }],
    });
  }
};
