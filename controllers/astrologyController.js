// controllers/astrologyController.js
import { genAI, geminiModelName } from '../config/gemini.js';

const getISOWeekRef = (date = new Date()) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const buildPrompt = (payload, weekRef) => {
  const serializedPayload = JSON.stringify(payload, null, 2);
  return `Você é um assistente que gera um tema astral semanal claro, objetivo e acolhedor em português do Brasil.

REGRAS GERAIS
- Estilo: humano, direto, sem exagero místico.
- Não use linguagem de certeza absoluta.
- Não gerar medo, fatalismo ou previsões catastróficas.
- Sempre incluir orientação prática e positiva.
- Saída obrigatoriamente em JSON válido (sem markdown).

CONTEXTO
- O usuário verá um card de "Tema Astral da Semana".
- Quando houver dados de nascimento, use apenas como pano de fundo leve (não invente mapa completo).

ENTRADA (JSON)
${serializedPayload}

TAREFA
1) Criar um tema astral semanal conciso e útil.
2) Gerar resumo curto para card e texto expandido para tela detalhada.
3) Incluir um foco principal e uma sugestão prática.
4) Entregar 3 palavras-chave.

SAÍDA (JSON EXATO)
{
  "week_ref": "${weekRef}",
  "headline": "string (até 90 caracteres)",
  "summary": "string (até 180 caracteres)",
  "detailed_theme": "string (300-900 caracteres)",
  "main_focus": "string (até 120 caracteres)",
  "practical_tip": "string (até 140 caracteres)",
  "keywords": ["string", "string", "string"],
  "disclaimer": "Conteúdo para autoconhecimento e reflexão pessoal."
}`;
};

export const generateWeeklyAstrologyTheme = async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    const safePayload = payload && typeof payload === 'object' ? payload : {};
    const weekRef = safePayload.week_ref || getISOWeekRef();

    const prompt = buildPrompt(safePayload, weekRef);
    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    try {
      const startIndex = rawText.indexOf('{');
      const endIndex = rawText.lastIndexOf('}');
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('Objeto JSON válido não foi encontrado na resposta da IA.');
      }
      const jsonString = rawText.substring(startIndex, endIndex + 1);
      const jsonData = JSON.parse(jsonString);
      return res.status(200).json(jsonData);
    } catch (parseError) {
      console.error('[Astrology Controller] Falha ao extrair/parse JSON.', { error: parseError.message, rawText });
      const trimmedRawText = rawText ? rawText.slice(0, 2000) : '';
      return res.status(502).json({ error: 'Falha ao formatar resposta.', rawText: trimmedRawText });
    }
  } catch (error) {
    console.error('[Astrology Controller] Erro ao gerar tema astral semanal:', error);


    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
    }

    return res.status(500).json({ error: 'Falha ao processar o tema astral semanal.' });
  }
};
