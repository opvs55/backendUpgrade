// controllers/oraclesController.js
import { genAI, geminiModelName } from '../config/gemini.js';

export const generateWeeklyOracleReading = async (req, res) => {
  try {
    const inputPayload = req.body;

    if (!inputPayload || typeof inputPayload !== 'object') {
      return res.status(400).json({ error: 'Payload JSON é obrigatório.' });
    }

    const requiredKeys = ['user', 'week_ref', 'focus_area', 'tarot', 'numerology', 'astrology', 'history_hint'];
    const missingKeys = requiredKeys.filter((key) => !(key in inputPayload));
    if (missingKeys.length > 0) {
      return res.status(400).json({
        error: 'Campos obrigatórios ausentes no payload.',
        missing_keys: missingKeys,
      });
    }

    const serializedPayload = JSON.stringify(inputPayload, null, 2);

    const prompt = `Você é um motor de interpretação simbólica para o produto "Oráculos".
Sua tarefa é gerar uma leitura semanal personalizada, clara e objetiva, em português do Brasil.

REGRAS GERAIS
- Estilo: acolhedor, direto, sem exagero místico.
- Não use linguagem de certeza absoluta.
- Não gerar medo, fatalismo ou previsões catastróficas.
- Sempre incluir orientação prática e positiva.
- Máximo de 700 palavras no total.
- Saída obrigatoriamente em JSON válido (sem markdown).

CONTEXTO DO PRODUTO
- O usuário vê um painel semanal com:
  1) Carta da Semana (tarot)
  2) Número da Semana (numerologia)
  3) Tema Astral da Semana
  4) Recomendação prática do dia
- A leitura deve integrar esses sinais num texto coerente.

ENTRADA (JSON)
${serializedPayload}

TAREFA
1) Integrar tarot + numerologia + tema astral em uma interpretação única.
2) Produzir resumo curto para card e versão completa para tela detalhada.
3) Produzir 1 ação prática para hoje e 1 foco principal da semana.
4) Sugerir 3 microações (simples, executáveis).
5) Produzir "sinal de atenção" (algo para evitar) de forma leve.
6) Personalizar levemente com base em focus_area e history_hint.
7) Se faltar dado astral real (birth_time/city), usar apenas "tema astral semanal" fornecido sem inventar mapa completo.

RESTRIÇÕES DE SEGURANÇA
- Não fornecer aconselhamento médico, jurídico, financeiro profissional.
- Não afirmar diagnóstico, maldição, destino fixo, morte, traição certa etc.
- Se o usuário estiver ansioso (quando indicado), use tom tranquilizador e prático.

SAÍDA (JSON EXATO)
{
  "week_ref": "YYYY-Www",
  "headline": "string (até 90 caracteres)",
  "card_summary": "string (até 180 caracteres)",
  "integrated_reading": "string (300-900 caracteres)",
  "main_focus": "string (até 120 caracteres)",
  "daily_action": "string (até 140 caracteres)",
  "micro_actions": [
    "string (até 100 caracteres)",
    "string (até 100 caracteres)",
    "string (até 100 caracteres)"
  ],
  "attention_point": "string (até 120 caracteres)",
  "energy_score": 0,
  "tags": ["string", "string", "string"],
  "disclaimer": "Conteúdo para autoconhecimento e reflexão pessoal."
}

REGRAS DO energy_score
- Número de 0 a 100.
- Baseie em coerência entre tarot, numerologia e astrologia:
  - sinais convergentes => score maior
  - sinais mistos => score intermediário
  - sinais conflitantes => score menor
- Nunca retornar fora do intervalo.

EXEMPLO DE TOM
- Claro, humano, útil.
- Sem jargão técnico astrológico excessivo.
`;

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
      console.error('[Oracles Controller] Falha ao extrair/parse JSON.', { error: parseError.message, rawText });
      const trimmedRawText = rawText ? rawText.slice(0, 2000) : '';
      return res.status(502).json({ error: 'Falha ao formatar resposta.', rawText: trimmedRawText });
    }
  } catch (error) {
    console.error('[Oracles Controller] Erro ao gerar leitura semanal:', error);
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
    }
    return res.status(500).json({ error: 'Falha ao processar a leitura semanal.' });
  }
};
