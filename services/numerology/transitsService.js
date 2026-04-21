import { reduceNumber, lifePathMeanings } from '../../utils/numerologyHelpers.js';
import { genAI, geminiModelName } from '../../config/gemini.js';
import { logger } from '../../shared/logging/logger.js';

const calcPersonalYear = (birthDate, targetDate = new Date()) => {
  const [, bMonth, bDay] = birthDate.split('-').map(Number);
  const year = targetDate.getUTCFullYear();
  return reduceNumber(reduceNumber(bDay) + reduceNumber(bMonth) + reduceNumber(year));
};

const calcPersonalMonth = (personalYear, targetDate = new Date()) => {
  const month = targetDate.getUTCMonth() + 1;
  return reduceNumber(personalYear + month);
};

const calcPersonalDay = (personalMonth, targetDate = new Date()) => {
  const day = targetDate.getUTCDate();
  return reduceNumber(personalMonth + day);
};

const PERSONAL_YEAR_THEMES = {
  1: 'Novos começos, iniciativas, plantio de sementes.',
  2: 'Parcerias, paciência, cooperação e diplomacia.',
  3: 'Expressão criativa, expansão social, otimismo.',
  4: 'Trabalho, estrutura, consolidação de bases.',
  5: 'Mudanças, liberdade, aventura e adaptação.',
  6: 'Responsabilidade, família, cura e serviço.',
  7: 'Introspecção, estudo, espiritualidade e recolhimento.',
  8: 'Poder, realizações materiais, liderança e autoridade.',
  9: 'Conclusão, colheita, desapego e renovação.',
  11: 'Inspiração elevada, iluminação e sensibilidade aguçada.',
  22: 'Grandes realizações práticas com visão ampla.',
  33: 'Serviço compassivo e expressão do amor universal.',
};

export const fetchOrCreateTransit = async ({ userId, supabase, birthDate, transitDate }) => {
  const dateStr = transitDate || new Date().toISOString().slice(0, 10);
  const targetDate = new Date(`${dateStr}T12:00:00Z`);

  const { data: existing } = await supabase
    .from('numerology_transits')
    .select('*')
    .eq('user_id', userId)
    .eq('transit_date', dateStr)
    .maybeSingle();

  if (existing) return { status: 200, body: existing };

  const personalYear = calcPersonalYear(birthDate, targetDate);
  const personalMonth = calcPersonalMonth(personalYear, targetDate);
  const personalDay = calcPersonalDay(personalMonth, targetDate);

  let aiNarrative = null;
  if (genAI) {
    try {
      const yearTheme = PERSONAL_YEAR_THEMES[personalYear] || '';
      const lpDesc = (lifePathMeanings[reduceNumber(birthDate.split('-').map((v, i) => i === 0 ? reduceNumber(v) : reduceNumber(Number(v))).reduce((a, b) => a + b, 0))] || '').slice(0, 200);
      const prompt = `Você é numerólogo brasileiro. Para a data ${dateStr}, este usuário está em:
- Ano Pessoal ${personalYear} (${yearTheme})
- Mês Pessoal ${personalMonth}
- Dia Pessoal ${personalDay}

Escreva uma orientação para hoje (2-3 frases), prática e positiva. Sem mencionar os números explicitamente. Responda só o texto.`;
      const model = genAI.getGenerativeModel({ model: geminiModelName });
      const result = await model.generateContent(prompt);
      aiNarrative = result.response.text()?.trim() || null;
    } catch (err) {
      logger.warn('transits.ai_failed', { userId, error: err?.message });
    }
  }

  const resultPayload = {
    personal_year: personalYear,
    personal_month: personalMonth,
    personal_day: personalDay,
    year_theme: PERSONAL_YEAR_THEMES[personalYear] || null,
    narrative: aiNarrative,
    transit_date: dateStr,
  };

  const { data: saved, error } = await supabase
    .from('numerology_transits')
    .insert({ user_id: userId, birth_date: birthDate, transit_date: dateStr, personal_year: personalYear, personal_month: personalMonth, personal_day: personalDay, result_payload: resultPayload })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: race } = await supabase.from('numerology_transits').select('*').eq('user_id', userId).eq('transit_date', dateStr).maybeSingle();
      return { status: 200, body: race };
    }
    throw new Error(error.message);
  }

  return { status: 201, body: saved };
};
