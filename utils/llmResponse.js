// utils/llmResponse.js
export const extractJsonFromText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Resposta da IA vazia ou inválida.');
  }

  const startIndex = rawText.indexOf('{');
  const endIndex = rawText.lastIndexOf('}');
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Objeto JSON válido não foi encontrado na resposta da IA.');
  }

  const jsonString = rawText.substring(startIndex, endIndex + 1);
  return JSON.parse(jsonString);
};
