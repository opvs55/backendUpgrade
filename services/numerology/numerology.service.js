import {
  reduceNumber,
  lifePathMeanings,
  birthdayNumberMeanings,
  buildUniversalMonthEnergy,
} from '../../utils/numerologyHelpers.js';
import { genAI, geminiModelName } from '../../config/gemini.js';
import { getWeekRef } from '../../utils/week.js';
import {
  getNumerologyWeeklyByUserAndWeekStart,
  upsertNumerologyWeeklyReading,
} from '../../repositories/numerologyWeeklyRepository.js';
import { logger } from '../../shared/logging/logger.js';
import { getMonthName, sanitizeNumerologyResponse } from './numerology.utils.js';

/**
 * @returns {{ status: number, body: object }}
 */
export const fetchOrCreatePersonalNumerology = async ({ userId, supabase, birthDate }) => {
  const { data: existingReading, error: fetchError } = await supabase
    .from('numerology_readings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    logger.error('numerology.personal.fetch_failed', { userId, error: fetchError.message });
    throw new Error('Erro ao verificar histórico.');
  }

  if (existingReading) {
    return { status: 200, body: sanitizeNumerologyResponse(existingReading) };
  }

  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { status: 404, body: { error: 'Leitura não encontrada. Forneça data válida.' } };
  }

  const [year, month, day] = birthDate.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Falha ao processar os componentes da data.');
  }

  const reducedDay = reduceNumber(day);
  const reducedMonth = reduceNumber(month);
  const reducedYear = reduceNumber(year);
  const lifePathNumber = reduceNumber(reducedDay + reducedMonth + reducedYear);
  const birthdayNumber = reducedDay;

  const lifePathMeaning = lifePathMeanings[lifePathNumber] || 'Significado do Caminho de Vida não disponível.';
  const birthdayMeaning = birthdayNumberMeanings[day] || 'Significado do dia de aniversário não disponível.';

  let birthdaySecretMeaning = null;
  if (!genAI) {
    logger.warn('numerology.personal.gemini_disabled', { userId });
    birthdaySecretMeaning = '{"error": "Serviço de IA não configurado no momento."}';
  } else {
    try {
      const monthName = getMonthName(month);
      if (monthName !== 'Mês Inválido') {
        const birthdayPrompt = `
          Aja como um numerólogo e astrólogo combinando conhecimentos do livro "O Significado Secreto dos Aniversários" de Gary Goldschneider e Joost Elffers.
          Analise a data de nascimento: ${day} de ${monthName}.
          Sua resposta DEVE ser um objeto JSON. Não inclua saudações, despedidas, explicações ou qualquer texto fora do objeto JSON.
          O JSON deve ter EXATAMENTE a seguinte estrutura:
          {
            "archetype_title": "O Título do Arquétipo do Dia (ex: O Dia da Aparente Simplicidade)",
            "archetype_description": "Um parágrafo de 3-5 frases descrevendo a essência das pessoas nascidas neste dia. Pode usar **negrito** para ênfase.",
            "tarot_card": "Uma análise sobre a carta de Tarot associada e seu significado (ex: 'A sexta carta dos Arcanos Maiores é Os Enamorados...')",
            "advice": "Um conselho prático (ex: 'Mantenha uma vida equilibrada e tome cuidado...')",
            "strengths": ["Um Ponto Forte", "Outro Ponto Forte", "Terceiro Ponto Forte"],
            "weaknesses": ["Um Ponto Fraco", "Outro Ponto Fraco", "Terceiro Ponto Fraco"]
          }
          Use a obra de Gary Goldschneider e Joost Elffers como referência.
        `;

        const model = genAI.getGenerativeModel({ model: geminiModelName });
        const result = await model.generateContent(birthdayPrompt);
        let responseText = result.response?.text();

        if (responseText) {
          if (responseText.startsWith('```json')) {
            responseText = responseText.substring(7, responseText.length - 3).trim();
          } else if (responseText.startsWith('```')) {
            responseText = responseText.substring(3, responseText.length - 3).trim();
          }
          birthdaySecretMeaning = responseText;
        } else {
          birthdaySecretMeaning = '{"error": "Não foi possível gerar a análise detalhada para este dia no momento."}';
        }
      }
    } catch (aiError) {
      if (aiError?.code === 'LLM_LOCATION_UNSUPPORTED') {
        return { status: 503, body: { error: 'Serviço de IA indisponível na localização configurada.' } };
      }
      logger.warn('numerology.personal.ai_failed', { userId, error: aiError?.message });
      birthdaySecretMeaning = `{"error": "Erro ao gerar a análise: ${aiError.message || 'Falha na IA'}"}`;
    }
  }

  const newReadingData = {
    user_id: userId,
    input_birth_date: birthDate,
    life_path_number: lifePathNumber,
    life_path_meaning: lifePathMeaning,
    birthday_number: birthdayNumber,
    birthday_meaning: birthdayMeaning,
    birthday_secret_meaning: birthdaySecretMeaning,
  };

  const { data: insertedReading, error: insertError } = await supabase
    .from('numerology_readings')
    .insert(newReadingData)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return { status: 409, body: { error: 'Erro de concorrência: Já existe uma leitura.' } };
    }
    logger.error('numerology.personal.insert_failed', { userId, error: insertError.message });
    throw new Error(`Erro ao salvar leitura (Insert): ${insertError.message}`);
  }

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ life_path_number: lifePathNumber, birthday_number: birthdayNumber })
    .eq('id', userId);

  if (profileUpdateError) {
    logger.error('numerology.personal.profile_update_failed', { userId, error: profileUpdateError.message });
    insertedReading.warning = 'A leitura foi salva, mas houve um erro ao atualizar seu perfil com os números.';
  }

  return { status: 201, body: sanitizeNumerologyResponse(insertedReading) };
};

/**
 * @returns {{ status: number, body: object }}
 */
export const deletePersonalNumerology = async ({ userId, supabase }) => {
  const { error: deleteError } = await supabase
    .from('numerology_readings')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    logger.error('numerology.reset.delete_failed', { userId, error: deleteError.message });
    throw new Error(`Erro ao apagar leitura (Delete): ${deleteError.message}`);
  }

  const { error: profileClearError } = await supabase
    .from('profiles')
    .update({ life_path_number: null, birthday_number: null })
    .eq('id', userId);

  if (profileClearError) {
    logger.warn('numerology.reset.profile_clear_failed', { userId, error: profileClearError.message });
  }

  return { status: 200, body: { message: 'Leitura numerológica apagada com sucesso.' } };
};

/**
 * @returns {{ status: number, body: object }}
 */
export const fetchOrCreateWeeklyNumerology = async ({
  userId,
  supabase,
  token,
  birthDate,
  weekStart,
}) => {
  const existing = await getNumerologyWeeklyByUserAndWeekStart(userId, weekStart, token);
  if (existing?.result_payload && Object.keys(existing.result_payload).length > 0) {
    return { status: 200, body: existing };
  }

  const { data: baseReading, error: baseError } = await supabase
    .from('numerology_readings')
    .select('life_path_number, input_birth_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (baseError) {
    logger.error('numerology.weekly.base_fetch_failed', { userId, error: baseError.message });
    throw new Error('Erro ao buscar numerologia base.');
  }

  let lifePathNumber = baseReading?.life_path_number ?? null;
  const resolvedBirthDate = birthDate || baseReading?.input_birth_date || null;

  if (lifePathNumber == null && resolvedBirthDate) {
    const [y, m, d] = resolvedBirthDate.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const reducedDay = reduceNumber(d);
      const reducedMonth = reduceNumber(m);
      const reducedYear = reduceNumber(y);
      lifePathNumber = reduceNumber(reducedDay + reducedMonth + reducedYear);
    }
  }

  if (lifePathNumber == null) {
    return {
      status: 400,
      body: {
        error: 'Calcule primeiro sua numerologia pessoal ou envie birthDate válida (YYYY-MM-DD).',
      },
    };
  }

  const weekRef = getWeekRef(new Date(`${weekStart}T12:00:00.000Z`));
  const numerologyTime = buildUniversalMonthEnergy(new Date());
  const personalWeekVibe = reduceNumber(lifePathNumber + numerologyTime.month_energy);

  let narrative = null;
  if (genAI) {
    try {
      const lpExcerpt = (lifePathMeanings[lifePathNumber] || '').slice(0, 500);
      const prompt = `Você é numeróloga em português brasileiro. Escreva 2 parágrafos curtos (sem fatalismo) sobre a energia desta semana (${weekRef}) para alguém com caminho de vida ${lifePathNumber}. Contexto: vibração mensal ${numerologyTime.month_energy}; combinação sugerida da semana ${personalWeekVibe}. Referência do caminho (resumo): ${lpExcerpt} Responda só o texto, sem JSON.`;
      const model = genAI.getGenerativeModel({ model: geminiModelName });
      const result = await model.generateContent(prompt);
      narrative = result.response.text()?.trim() || null;
    } catch (aiErr) {
      logger.warn('numerology.weekly.ai_failed', { userId, error: aiErr?.message });
    }
  }

  const themes = [
    `Caminho ${lifePathNumber} + energia mensal ${numerologyTime.month_energy}`,
    `Foco semanal sugerido: vibração ${personalWeekVibe}`,
  ];

  const resultPayload = {
    week_ref: weekRef,
    life_path_number: lifePathNumber,
    personal_week_vibe: personalWeekVibe,
    numerology_time: numerologyTime,
    themes,
    narrative,
  };

  const hadRow = Boolean(existing);

  const saved = await upsertNumerologyWeeklyReading(
    {
      user_id: userId,
      week_start: weekStart,
      week_ref: weekRef,
      result_payload: resultPayload,
      input_payload: { birthDate: resolvedBirthDate },
      updated_at: new Date().toISOString(),
    },
    token,
  );

  return { status: hadRow ? 200 : 201, body: saved };
};
