import { genAI, geminiModelName } from '../../config/gemini.js';
import { logger } from '../../shared/logging/logger.js';

const TAROT_DECK = [
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

const seededRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

const pickCardForDate = (dateStr) => {
  const seed = dateStr.replace(/-/g, '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);
  const index = Math.floor(rng() * TAROT_DECK.length);
  return TAROT_DECK[index];
};

export const fetchOrCreateDailyOracle = async ({ userId, supabase, oracleDate }) => {
  const dateStr = oracleDate || new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from('daily_oracle')
    .select('*')
    .eq('user_id', userId)
    .eq('oracle_date', dateStr)
    .maybeSingle();

  if (existing) return { status: 200, body: existing };

  const card = pickCardForDate(dateStr);

  let interpretation = null;
  if (genAI) {
    try {
      const prompt = `Você é um tarólogo brasileiro. Para o dia ${dateStr}, a carta do dia é "${card.name}".
Escreva uma mensagem oracular curta (3-4 frases) em português, direta, sem mencionar o nome da carta explicitamente no início. Foque em energia, ação e intenção para o dia. Sem fatalismo. Responda só o texto.`;
      const model = genAI.getGenerativeModel({ model: geminiModelName });
      const result = await model.generateContent(prompt);
      interpretation = result.response.text()?.trim() || null;
    } catch (err) {
      logger.warn('daily_oracle.ai_failed', { userId, error: err?.message });
    }
  }

  const { data: inserted, error } = await supabase
    .from('daily_oracle')
    .insert({ user_id: userId, oracle_date: dateStr, card_id: card.id, card_name: card.name, interpretation })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: race } = await supabase.from('daily_oracle').select('*').eq('user_id', userId).eq('oracle_date', dateStr).maybeSingle();
      return { status: 200, body: race };
    }
    throw new Error(error.message);
  }

  return { status: 201, body: inserted };
};
