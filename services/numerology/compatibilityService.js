import { reduceNumber, lifePathMeanings } from '../../utils/numerologyHelpers.js';
import { genAI, geminiModelName } from '../../config/gemini.js';
import { logger } from '../../shared/logging/logger.js';

const calcLifePath = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return reduceNumber(reduceNumber(d) + reduceNumber(m) + reduceNumber(y));
};

const COMPATIBILITY_SCORES = {
  '1-1': 60, '1-2': 75, '1-3': 85, '1-4': 65, '1-5': 80, '1-6': 70, '1-7': 75, '1-8': 70, '1-9': 65,
  '2-2': 80, '2-3': 85, '2-4': 75, '2-5': 60, '2-6': 90, '2-7': 70, '2-8': 65, '2-9': 80,
  '3-3': 75, '3-4': 65, '3-5': 90, '3-6': 80, '3-7': 70, '3-8': 65, '3-9': 85,
  '4-4': 70, '4-5': 60, '4-6': 85, '4-7': 80, '4-8': 90, '4-9': 65,
  '5-5': 65, '5-6': 70, '5-7': 75, '5-8': 65, '5-9': 80,
  '6-6': 85, '6-7': 75, '6-8': 70, '6-9': 90,
  '7-7': 70, '7-8': 65, '7-9': 75,
  '8-8': 75, '8-9': 70,
  '9-9': 80,
};

const getScore = (lp1, lp2) => {
  const key = [Math.min(lp1, lp2), Math.max(lp1, lp2)].join('-');
  return COMPATIBILITY_SCORES[key] || 70;
};

export const calculateCompatibility = async ({ userId, supabase, name1, birthDate1, name2, birthDate2 }) => {
  const lp1 = calcLifePath(birthDate1);
  const lp2 = calcLifePath(birthDate2);
  const score = getScore(lp1 % 9 || 9, lp2 % 9 || 9);

  let aiAnalysis = null;
  if (genAI) {
    try {
      const desc1 = (lifePathMeanings[lp1] || '').slice(0, 300);
      const desc2 = (lifePathMeanings[lp2] || '').slice(0, 300);
      const prompt = `Você é um numerólogo brasileiro. Analise a compatibilidade entre:
- ${name1} (Caminho de Vida ${lp1}): ${desc1}
- ${name2} (Caminho de Vida ${lp2}): ${desc2}

Escreva uma análise em JSON com EXATAMENTE esta estrutura:
{
  "score": ${score},
  "headline": "Uma frase resumindo a dinâmica do par",
  "harmony": "2-3 frases sobre o que funciona bem entre eles",
  "tension": "2-3 frases sobre desafios e pontos de atrito",
  "advice": "1-2 frases de conselho prático para o casal",
  "aspects": ["Aspecto positivo 1", "Aspecto positivo 2", "Aspecto positivo 3"]
}
Responda APENAS o JSON.`;
      const model = genAI.getGenerativeModel({ model: geminiModelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text()?.trim();
      if (text?.startsWith('```')) text = text.replace(/```json?|```/g, '').trim();
      aiAnalysis = JSON.parse(text);
    } catch (err) {
      logger.warn('compatibility.ai_failed', { userId, error: err?.message });
      aiAnalysis = { score, headline: 'Análise indisponível no momento.', harmony: null, tension: null, advice: null, aspects: [] };
    }
  }

  const resultPayload = { ...aiAnalysis, lp1, lp2, name1, name2 };

  const { data: saved, error } = await supabase
    .from('numerology_compatibility')
    .insert({ user_id: userId, name1, birth_date1: birthDate1, name2, birth_date2: birthDate2, life_path1: lp1, life_path2: lp2, result_payload: resultPayload })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { status: 201, body: saved };
};
