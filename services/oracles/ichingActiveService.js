import { genAI, geminiModelName } from '../../config/gemini.js';
import { extractJsonFromText } from '../../utils/llmResponse.js';
import { logger } from '../../shared/logging/logger.js';

const HEXAGRAMS = [
  'A Criação','A Receptividade','A Dificuldade Inicial','A Tolice Juvenil','A Espera','O Conflito',
  'O Exército','A Solidariedade','O Poder Tênue','A Conduta','A Paz','A Estagnação',
  'A Comunhão','A Grande Posse','A Humildade','O Entusiasmo','O Seguimento','A Reparação',
  'A Aproximação','A Contemplação','A Mordida','A Graça','A Divisão','O Retorno',
  'A Inocência','O Grande Acúmulo','As Quinas da Boca','A Preponderância do Grande','O Abismo','O Apego',
  'A Influência','A Duração','O Recolhimento','O Grande Poder','O Progresso','O Eclipse',
  'A Família','A Contradição','O Obstáculo','A Libertação','A Diminuição','O Aumento',
  'A Decisão','A Chegada','A Reunião','O Impulso para Cima','A Opressão','O Poço',
  'A Revolução','O Caldeirão','O Movimento Trovejante','A Quietude','O Gradual Progresso','A Noiva',
  'A Abundância','O Viajante','O Suave','A Alegria','A Dispersão','O Limite',
  'A Verdade Interior','A Preponderância do Pequeno','O Já Consumado','O Ainda Não Consumado',
];

const pickHexagram = (question) => {
  const seed = question.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + Date.now() % 64;
  const index = seed % 64;
  return { number: index + 1, name: HEXAGRAMS[index] };
};

const pickChangingLines = () => {
  const lines = [];
  for (let i = 0; i < 6; i++) {
    if (Math.random() < 0.25) lines.push(i + 1);
  }
  return lines;
};

export const createActiveIchingReading = async ({ userId, supabase, question }) => {
  const hexagram = pickHexagram(question);
  const changingLines = pickChangingLines();

  let resultPayload = null;
  if (genAI) {
    try {
      const prompt = `Você é um intérprete do I Ching em português brasileiro.
A pergunta do consulente é: "${question}"
O hexagrama sorteado é: ${hexagram.number} — ${hexagram.name}
Linhas em mutação: ${changingLines.length > 0 ? changingLines.join(', ') : 'nenhuma'}

Responda com JSON exato (sem markdown):
{
  "hexagram_number": ${hexagram.number},
  "hexagram_name": "${hexagram.name}",
  "headline": "Uma frase que captura a essência desta leitura",
  "interpretation": "3-4 parágrafos interpretando o hexagrama em relação à pergunta. Tom acolhedor, sem fatalismo.",
  "changing_lines_meaning": "${changingLines.length > 0 ? 'Significado das linhas em mutação e sua influência' : null}",
  "advice": "1-2 frases de conselho prático",
  "themes": ["tema1", "tema2", "tema3"]
}`;
      const model = genAI.getGenerativeModel({ model: geminiModelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      resultPayload = extractJsonFromText(text);
    } catch (err) {
      logger.warn('iching_active.ai_failed', { userId, error: err?.message });
      resultPayload = { hexagram_number: hexagram.number, hexagram_name: hexagram.name, headline: 'Leitura em processamento', interpretation: null, advice: null, themes: [] };
    }
  } else {
    resultPayload = { hexagram_number: hexagram.number, hexagram_name: hexagram.name, headline: null, interpretation: null, advice: null, themes: [] };
  }

  const { data: saved, error } = await supabase
    .from('iching_active_readings')
    .insert({ user_id: userId, question, hexagram_number: hexagram.number, hexagram_name: hexagram.name, changing_lines: changingLines, result_payload: resultPayload })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { status: 201, body: saved };
};

export const getIchingActiveHistory = async ({ userId, supabase, limit = 10 }) => {
  const { data, error } = await supabase
    .from('iching_active_readings')
    .select('id, question, hexagram_number, hexagram_name, changing_lines, result_payload, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return { status: 200, body: data || [] };
};
