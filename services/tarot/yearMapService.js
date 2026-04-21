import { genAI, geminiModelName } from '../../config/gemini.js';
import { logger } from '../../shared/logging/logger.js';

const TAROT_MAJOR_ARCANA = [
  { id: 'fool', name: 'O Louco' }, { id: 'magician', name: 'O Mago' },
  { id: 'high_priestess', name: 'A Sacerdotisa' }, { id: 'empress', name: 'A Imperatriz' },
  { id: 'emperor', name: 'O Imperador' }, { id: 'hierophant', name: 'O Hierofante' },
  { id: 'lovers', name: 'Os Enamorados' }, { id: 'chariot', name: 'O Carro' },
  { id: 'strength', name: 'A Força' }, { id: 'hermit', name: 'O Eremita' },
  { id: 'wheel', name: 'A Roda da Fortuna' }, { id: 'justice', name: 'A Justiça' },
  { id: 'hanged_man', name: 'O Enforcado' }, { id: 'death', name: 'A Morte' },
  { id: 'temperance', name: 'A Temperança' }, { id: 'devil', name: 'O Diabo' },
  { id: 'tower', name: 'A Torre' }, { id: 'star', name: 'A Estrela' },
  { id: 'moon', name: 'A Lua' }, { id: 'sun', name: 'O Sol' },
  { id: 'judgement', name: 'O Julgamento' }, { id: 'world', name: 'O Mundo' },
];

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const seededRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

const drawYearCards = (userId, year) => {
  const seed = `${userId}-${year}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);
  const deck = [...TAROT_MAJOR_ARCANA];
  const drawn = [];
  for (let i = 0; i < 12; i++) {
    const idx = Math.floor(rng() * deck.length);
    drawn.push({ month: i + 1, month_name: MONTH_NAMES[i], ...deck.splice(idx, 1)[0] });
  }
  return drawn;
};

export const fetchOrCreateYearMap = async ({ userId, supabase, year }) => {
  const targetYear = year || new Date().getUTCFullYear();

  const { data: existing } = await supabase
    .from('year_map_readings')
    .select('*')
    .eq('user_id', userId)
    .eq('year', targetYear)
    .maybeSingle();

  if (existing) return { status: 200, body: existing };

  const cards = drawYearCards(userId, targetYear);

  let finalReading = null;
  if (genAI) {
    try {
      const cardList = cards.map(c => `${c.month_name}: ${c.name}`).join(', ');
      const prompt = `Você é um tarólogo brasileiro. Este é o Mapa do Ano ${targetYear} de um consulente.
As 12 cartas (uma por mês) são: ${cardList}.

Escreva uma visão geral do ano em JSON exato:
{
  "headline": "Uma frase que captura a essência do ano",
  "overview": "2-3 parágrafos sobre os grandes temas e movimentos do ano como um todo",
  "peak_months": [3, 7, 11],
  "challenge_months": [2, 9],
  "year_theme": "O grande tema arquetípico deste ano em uma palavra ou expressão"
}
Responda APENAS o JSON, sem markdown.`;
      const model = genAI.getGenerativeModel({ model: geminiModelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text()?.trim();
      if (text?.startsWith('```')) text = text.replace(/```json?|```/g, '').trim();
      finalReading = JSON.parse(text);
    } catch (err) {
      logger.warn('year_map.ai_failed', { userId, error: err?.message });
    }
  }

  const { data: saved, error } = await supabase
    .from('year_map_readings')
    .insert({ user_id: userId, year: targetYear, cards_data: cards, final_reading: finalReading, status: finalReading ? 'ok' : 'partial' })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: race } = await supabase.from('year_map_readings').select('*').eq('user_id', userId).eq('year', targetYear).maybeSingle();
      return { status: 200, body: race };
    }
    throw new Error(error.message);
  }

  return { status: 201, body: saved };
};
