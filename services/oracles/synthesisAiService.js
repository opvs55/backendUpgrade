import { genAI, geminiModelName } from '../../config/gemini.js';

const fallbackReading = ({ focusArea, question, sourcesUsed }) => ({
  title: 'Leitura geral (modo seguro)',
  overview: 'Com base nos seus dados disponíveis, esta semana pede constância e ajustes conscientes.',
  strengths: ['Clareza gradual', 'Boa capacidade de adaptação'],
  cautions: ['Evite decisões por impulso', 'Respeite seu ritmo energético'],
  guidance: ['Defina 1 prioridade por dia', 'Revise metas de curto prazo no fim da semana'],
  focus: focusArea || 'general',
  closing_message: question ? `Pergunta considerada: ${question}` : 'Siga com presença e intencionalidade.',
  sources_used: sourcesUsed,
});

export const generateSynthesis = async ({ context, focusArea, question, sourcesUsed }) => {
  if (!genAI) {
    return fallbackReading({ focusArea, question, sourcesUsed });
  }

  const prompt = `Retorne APENAS JSON válido para uma leitura geral em pt-BR.
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
  "sources_used":["profile","natal_chart","numerology","weekly_card"]
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
