import { genAI, geminiModelName } from '../../config/gemini.js';

const fallbackReading = ({ focusArea, question, sourcesUsed }) => ({
  title: 'Oráculo do Grimório (semanal)',
  overview: 'Esta semana pede foco prático, constância emocional e decisões conscientes.',
  strengths: ['Clareza na priorização', 'Capacidade de adaptação com propósito'],
  cautions: ['Evite dispersar energia em muitas frentes', 'Não adie conversas importantes'],
  guidance: ['Defina um objetivo semanal principal', 'Revise diariamente pequenos avanços'],
  focus: focusArea || 'geral',
  closing_message: question ? `Pergunta considerada: ${question}` : 'Use esta leitura como bússola de autoconhecimento para a semana.',
  sources_used: sourcesUsed,
});

export const generateSynthesis = async ({ context, focusArea, question, sourcesUsed }) => {
  if (!genAI) {
    return fallbackReading({ focusArea, question, sourcesUsed });
  }

  const prompt = `Retorne APENAS JSON válido para o "Oráculo do Grimório" semanal em pt-BR.
Integre Tarot semanal + Numerologia base/semanal + Runas semanais + I Ching semanal + histórico recente de Tarot.
Evite fatalismo e seja prático.
Contexto: ${JSON.stringify(context)}
Estrutura:
{
  "title":"string",
  "overview":"string",
  "strengths":["string"],
  "cautions":["string"],
  "guidance":["string"],
  "focus":"string",
  "closing_message":"string",
  "sources_used":["tarot_weekly","numerology_base","numerology_weekly","runes_weekly","iching_weekly","tarot_history_summary"]
}`;

  try {
    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('JSON ausente');
    const parsed = JSON.parse(text.slice(start, end + 1));
    return { ...parsed, sources_used: sourcesUsed };
  } catch {
    return fallbackReading({ focusArea, question, sourcesUsed });
  }
};
