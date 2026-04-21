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

const distillContext = (context) => {
  const snap = context?.modules_snapshot || {};
  const profile = snap.profile || context?.profile || {};
  const tarot = snap.tarot_weekly || {};
  const runes = snap.runes_weekly || {};
  const iching = snap.iching_weekly || {};
  const numerologyWeekly = snap.numerology_weekly || {};
  const numerologyTime = snap.numerology_time || {};

  return {
    semana: context?.week_ref || null,
    pessoa: {
      nome: profile?.name || profile?.username || null,
      caminho_de_vida: numerologyWeekly?.life_path_number ?? null,
      vibracao_semanal: numerologyWeekly?.personal_week_vibe ?? null,
      vibracao_mensal: numerologyTime?.month_energy ?? null,
      narrativa_numerologica: numerologyWeekly?.narrative || null,
    },
    tarot: tarot?.card_name
      ? {
          carta: tarot.card_name,
          tema: tarot?.theme || tarot?.interpretation || null,
        }
      : null,
    runas: runes?.runes
      ? {
          runas: (Array.isArray(runes.runes) ? runes.runes : [])
            .slice(0, 3)
            .map((r) => ({ nome: r?.name || r?.rune_name || r?.key || r, interpretacao: r?.interpretation || r?.meaning || null })),
          tema: runes?.theme || runes?.headline || null,
          narrativa: runes?.narrative || runes?.summary || null,
        }
      : null,
    iching: iching?.hexagram_number || iching?.hexagram?.number
      ? {
          hexagrama: iching?.hexagram_number || iching?.hexagram?.number,
          nome: iching?.hexagram_name || iching?.hexagram?.name || null,
          tema: iching?.theme || iching?.headline || null,
          narrativa: iching?.narrative || iching?.summary || null,
        }
      : null,
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

  const distilled = distillContext(context);
  const nomeCliente = distilled.pessoa?.nome ? ` para ${distilled.pessoa.nome}` : '';
  const caminhoDeVida = distilled.pessoa?.caminho_de_vida ? `, Caminho de Vida ${distilled.pessoa.caminho_de_vida}` : '';
  const vibracaoSemanal = distilled.pessoa?.vibracao_semanal ? `, vibração semanal ${distilled.pessoa.vibracao_semanal}` : '';

  const prompt = `Você é um oráculo sábio em português brasileiro com voz poética, direta e profunda.
Produza uma leitura semanal integrando os sinais oraculares disponíveis abaixo${nomeCliente}${caminhoDeVida}${vibracaoSemanal}.

Regras:
- Tom: acolhedor, mágico, claro, prático — sem fatalismo nem exagero espiritual.
- Use o nome da pessoa quando disponível para personalizar a leitura (ex: "Para você, [nome]...").
- Integre os sinais de forma que pareçam uma conversa única e coesa, não uma lista de módulos separados.
- Se um sinal estiver ausente, escreva literalmente "Sinal ausente nesta semana" e continue.
- Nunca invente cartas, hexagramas, runas ou dados não fornecidos.
- Não mencione tecnologia, sistemas, módulos ou estruturas internas.
- O campo "energy_score" deve ser um número inteiro de 0 a 100 refletindo a qualidade energética da semana.
- Retorne APENAS JSON válido, sem texto antes ou depois.

Formato obrigatório:
{
  "title": "string (título poético da semana)",
  "one_liner": "string (frase-síntese de uma linha, impactante)",
  "overview": ["parágrafo narrativo 1", "parágrafo narrativo 2"],
  "signals": {
    "tarot": "string",
    "runes": "string",
    "i_ching": "string",
    "numerology": "string"
  },
  "synthesis": {
    "convergences": ["o que os oráculos dizem em uníssono (2-4 itens)"],
    "tensions": ["onde há tensão ou desafio (1-3 itens)"],
    "theme_of_week": "string (tema central da semana em poucas palavras)",
    "hidden_lesson": "string (lição mais sutil da semana)"
  },
  "practical_guidance": {
    "do": ["ação concreta 1", "ação concreta 2", "ação concreta 3"],
    "avoid": ["o que evitar 1", "o que evitar 2"],
    "ritual": "string (ritual simples para a semana)",
    "reflection_question": "string (pergunta poderosa para reflexão)"
  },
  "closing": "string (frase final de encerramento, calorosa e encorajadora)",
  "tags": ["string"],
  "energy_score": 0
}

Sinais oraculares desta semana:
${JSON.stringify(distilled, null, 2)}`;

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
