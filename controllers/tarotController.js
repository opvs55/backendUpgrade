// controllers/tarotController.js
import { genAI, geminiModelName } from '../config/gemini.js'; // Importa o cliente configurado

// --- Lógica para Gerar Leitura Principal ---
export const generateTarotReading = async (req, res) => {
  try {
    const { question, cards, spreadType } = req.body;

    if (!question || !cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Dados inválidos. Pergunta e cartas são necessárias.' });
    }
    
    let prompt;
    if (spreadType === 'threeCards') {
      prompt = `
      Você é uma taróloga sábia e intuitiva. Sua tarefa é analisar uma pergunta e escolher o melhor método de leitura de 3 cartas para respondê-la, e depois realizar a interpretação.

      1.  **ANÁLISE DA PERGUNTA:**
          A pergunta do consulente é: "${question}"

      2.  **ESCOLHA DO MÉTODO:**
          Baseado na pergunta, escolha UM dos seguintes contextos para a leitura de 3 cartas:
          - ["Passado", "Presente", "Futuro"]: Para questões sobre desenvolvimento temporal, causas e consequências.
          - ["Situação", "Obstáculo", "Conselho"]: Para problemas atuais e busca por orientação prática.
          - ["Mente", "Corpo", "Espírito"]: Para questões de autoconhecimento e equilíbrio interno.
          - ["Você", "A outra pessoa", "A Relação"]: Para questões sobre relacionamentos.

      3.  **CARTAS SORTEADAS:**
          As 3 cartas sorteadas foram:
          - Carta 1: ${cards[0].nome} ${cards[0].invertida ? '(Invertida)' : ''}
          - Carta 2: ${cards[1].nome} ${cards[1].invertida ? '(Invertida)' : ''}
          - Carta 3: ${cards[2].nome} ${cards[2].invertida ? '(Invertida)' : ''}

      4.  **TAREFA FINAL:**
          Agora, retorne sua resposta EXCLUSIVAMENTE em formato JSON, sem nenhum texto ou formatação extra (como \`\`\`json), seguindo esta estrutura:
          {
            "contexto_escolhido": {
              "titulo": "O nome do método que você escolheu (ex: Situação, Obstáculo, Conselho)",
              "posicoes": ["Nome da Posição 1", "Nome da Posição 2", "Nome da Posição 3"]
            },
            "interpretacao": {
              "titulo_leitura": "Crie um título poético e impactante para esta leitura específica.",
              "resumo": "Escreva um parágrafo curto e direto que resuma a mensagem central das cartas.",
              "analise_cartas": [
                {
                  "posicao": "Nome da Posição 1",
                  "texto": "Analise a primeira carta dentro do significado desta posição, conectando com a pergunta do consulente."
                },
                {
                  "posicao": "Nome da Posição 2",
                  "texto": "Analise a segunda carta dentro do significado desta posição, conectando com a pergunta do consulente."
                },
                {
                  "posicao": "Nome da Posição 3",
                  "texto": "Analise a terceira carta dentro do significado desta posição, conectando com a pergunta do consulente."
                }
              ],
              "conselho_final": "Conclua com um parágrafo de conselho prático e inspirador para o consulente."
            }
          }
      `;
    } else if (spreadType === 'templeOfAphrodite') {
      // Este prompt já usa question.name1 e question.name2
      prompt = `
      Aja como uma taróloga especialista em dinâmicas de relacionamento, com uma abordagem psicológica e empática.
      A análise é para a relação entre "${question.name1}" e "${question.name2}".

      A tiragem "Templo de Afrodite" revelou 7 cartas, seguindo a estrutura da imagem (1,2,3 para a primeira pessoa; 4,5,6 para a segunda).

      **AS CARTAS SORTEADAS SÃO:**

      --- ANÁLISE DE "${question.name1}" ---
      - Posição 1 (Pensamentos / Intenções de ${question.name1}): ${cards[0].nome} ${cards[0].invertida ? '(Invertida)' : ''}
      - Posição 2 (Sentimentos / Emoções de ${question.name1}): ${cards[1].nome} ${cards[1].invertida ? '(Invertida)' : ''}
      - Posição 3 (Atração Sexual / Física de ${question.name1}): ${cards[2].nome} ${cards[2].invertida ? '(Invertida)' : ''}

      --- ANÁLISE DE "${question.name2}" ---
      - Posição 4 (Pensamentos / Intenções de ${question.name2}): ${cards[3].nome} ${cards[3].invertida ? '(Invertida)' : ''}
      - Posição 5 (Sentimentos / Emoções de ${question.name2}): ${cards[4].nome} ${cards[4].invertida ? '(Invertida)' : ''}
      - Posição 6 (Atração Sexual / Física de ${question.name2}): ${cards[5].nome} ${cards[5].invertida ? '(Invertida)' : ''}

      --- SÍNTESE ---
      - Posição 7 (Futuro do Casal / Conselho): ${cards[6].nome} ${cards[6].invertida ? '(Invertida)' : ''}

      **TAREFA FINAL:**
      Crie uma análise profunda e coesa. Retorne sua resposta EXCLUSIVAMENTE em formato JSON, sem nenhum texto ou formatação extra, seguindo esta estrutura:
      {
        "titulo_leitura": "Crie um título poético para esta leitura de relacionamento.",
        "resumo_geral": "Escreva um parágrafo curto que resuma a dinâmica geral entre ${question.name1} e ${question.name2} revelada pelas cartas.",
        "analise_pessoa1": {
          "titulo": "Análise de ${question.name1}",
          "pensamentos": "Analise a carta 1 (Pensamentos de ${question.name1}).",
          "sentimentos": "Analise a carta 2 (Sentimentos de ${question.name1}).",
          "atracao": "Analise a carta 3 (Atração de ${question.name1})."
        },
        "analise_pessoa2": {
          "titulo": "Análise de ${question.name2}",
          "pensamentos": "Analise a carta 4 (Pensamentos de ${question.name2}).",
          "sentimentos": "Analise a carta 5 (Sentimentos de ${question.name2}).",
          "atracao": "Analise a carta 6 (Atração de ${question.name2})."
        },
        "futuro_casal": {
          "titulo": "O Futuro do Casal",
          "texto": "Analise a carta 7 como a síntese, o futuro provável ou o conselho final para a relação."
        }
      }
      `;
    } else if (spreadType === 'pathChoice') {
      prompt = `
      Aja como uma conselheira sábia e taróloga, guiando uma pessoa em um momento de decisão.
      O consulente está em dúvida entre dois caminhos:
      - Caminho 1: "${question.path1}"
      - Caminho 2: "${question.path2}"

      Foram sorteadas 8 cartas. As 4 primeiras são para o Caminho 1 e as 4 últimas para o Caminho 2.

      **CARTAS PARA O CAMINHO 1 ("${question.path1}"):**
      - Posição 1 (O que favorece): ${cards[0].nome} ${cards[0].invertida ? '(Invertida)' : ''}
      - Posição 2 (O que precisa ser trabalhado): ${cards[1].nome} ${cards[1].invertida ? '(Invertida)' : ''}
      - Posição 3 (A perspectiva): ${cards[2].nome} ${cards[2].invertida ? '(Invertida)' : ''}
      - Posição 4 (O conselho): ${cards[3].nome} ${cards[3].invertida ? '(Invertida)' : ''}

      **CARTAS PARA O CAMINHO 2 ("${question.path2}"):**
      - Posição 1 (O que favorece): ${cards[4].nome} ${cards[4].invertida ? '(Invertida)' : ''}
      - Posição 2 (O que precisa ser trabalhado): ${cards[5].nome} ${cards[5].invertida ? '(Invertida)' : ''}
      - Posição 3 (A perspectiva): ${cards[6].nome} ${cards[6].invertida ? '(Invertida)' : ''}
      - Posição 4 (O conselho): ${cards[7].nome} ${cards[7].invertida ? '(Invertida)' : ''}

      **TAREFA FINAL:**
      Crie uma análise comparativa. Retorne sua resposta EXCLUSIVAMENTE em formato JSON, sem nenhum texto extra, seguindo esta estrutura:
      {
        "titulo_leitura": "Crie um título poético para esta escolha.",
        "caminho1": {
          "titulo": "${question.path1}",
          "analises": [
            { "posicao": "O que favorece", "texto": "Analise a carta 1 neste contexto." },
            { "posicao": "O que precisa ser trabalhado", "texto": "Analise a carta 2 neste contexto." },
            { "posicao": "Perspectiva", "texto": "Analise a carta 3 neste contexto." },
            { "posicao": "Conselho", "texto": "Analise a carta 4 neste contexto." }
          ]
        },
        "caminho2": {
          "titulo": "${question.path2}",
          "analises": [
            { "posicao": "O que favorece", "texto": "Analise a carta 5 neste contexto." },
            { "posicao": "O que precisa ser trabalhado", "texto": "Analise a carta 6 neste contexto." },
            { "posicao": "Perspectiva", "texto": "Analise a carta 7 neste contexto." },
            { "posicao": "Conselho", "texto": "Analise a carta 8 neste contexto." }
          ]
        },
        "comparativo_final": "Escreva um parágrafo de conclusão que compare as energias dos dois caminhos e ofereça uma síntese ou conselho final para ajudar o consulente na sua decisão, sem dizer a ele qual caminho escolher, mas sim iluminando das qualidades de cada um."
      }
      `;
    } else if (spreadType === 'celticCross') {
      prompt = `
      Aja como uma taróloga experiente com uma profunda abordagem psicológica e terapêutica.
      A pergunta do consulente é: "${question}".
      A tiragem da Cruz Celta revelou as seguintes 10 cartas:

      **AS CARTAS SORTEADAS SÃO:**
      - Posição 1 (O Coração da Matéria): ${cards[0].nome} ${cards[0].invertida ? '(Invertida)' : ''}
      - Posição 2 (O Desafio Imediato): ${cards[1].nome} ${cards[1].invertida ? '(Invertida)' : ''}
      - Posição 3 (A Base da Questão / Passado Recente): ${cards[2].nome} ${cards[2].invertida ? '(Invertida)' : ''}
      - Posição 4 (O Passado Distante / Fundações): ${cards[3].nome} ${cards[3].invertida ? '(Invertida)' : ''}
      - Posição 5 (O Objetivo / Futuro Próximo): ${cards[4].nome} ${cards[4].invertida ? '(Invertida)' : ''}
      - Posição 6 (O Caminho / Futuro Distante): ${cards[5].nome} ${cards[5].invertida ? '(Invertida)' : ''}
      - Posição 7 (O Consulente / Como se vê): ${cards[6].nome} ${cards[6].invertida ? '(Invertida)' : ''}
      - Posição 8 (O Ambiente / Influências Externas): ${cards[7].nome} ${cards[7].invertida ? '(Invertida)' : ''}
      - Posição 9 (Esperanças e Medos): ${cards[8].nome} ${cards[8].invertida ? '(Invertida)' : ''}
      - Posição 10 (O Resultado Final / Síntese): ${cards[9].nome} ${cards[9].invertida ? '(Invertida)' : ''}

      **TAREFA FINAL:**
      Crie uma análise profunda e coesa, conectando as cartas às suas posições e à pergunta. Retorne sua resposta EXCLUSIVAMENTE em formato JSON, sem nenhum texto ou formatação extra, seguindo esta estrutura:
      {
        "titulo_leitura": "Crie um título poético e impactante para esta leitura.",
        "resumo_geral": "Escreva um parágrafo curto que resuma a mensagem central da jornada de 10 cartas.",
        "analise_cartas": [
          { "posicao": "Posição 1: O Coração da Matéria", "texto": "Analise a carta 1 (${cards[0].nome}) neste contexto, conectando com a pergunta." },
          { "posicao": "Posição 2: O Desafio Imediato", "texto": "Analise a carta 2 (${cards[1].nome}) neste contexto." },
          { "posicao": "Posição 3: A Base da Questão", "texto": "Analise a carta 3 (${cards[2].nome}) neste contexto." },
          { "posicao": "Posição 4: O Passado Distante", "texto": "Analise a carta 4 (${cards[3].nome}) neste contexto." },
          { "posicao": "Posição 5: O Objetivo", "texto": "Analise a carta 5 (${cards[4].nome}) neste contexto." },
          { "posicao": "Posição 6: O Caminho", "texto": "Analise a carta 6 (${cards[5].nome}) neste contexto." },
          { "posicao": "Posição 7: O Consulente", "texto": "Analise a carta 7 (${cards[6].nome}) neste contexto." },
          { "posicao": "Posição 8: O Ambiente", "texto": "Analise a carta 8 (${cards[7].nome}) neste contexto." },
          { "posicao": "Posição 9: Esperanças e Medos", "texto": "Analise a carta 9 (${cards[8].nome}) neste contexto." }
        ],
        "conselho_final": "Analise a carta 10 (${cards[9].nome}) como a síntese e o conselho final para o consulente."
      }
      `;
    } else { 
      console.error(`[Tarot Controller] ERRO: spreadType '${spreadType}' não é reconhecido.`);
      return res.status(400).json({ error: `O tipo de tiragem '${spreadType}' não é reconhecido.` });
    }

    // Chama a IA
    const model = genAI.getGenerativeModel({ model: geminiModelName }); // Usa o nome do modelo importado
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    
    // Processa a resposta (lógica JSON)
    if (['threeCards', 'templeOfAphrodite', 'pathChoice', 'celticCross'].includes(spreadType)) {
      try {
        const startIndex = rawText.indexOf('{');
        const endIndex = rawText.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1) {
          throw new Error("Objeto JSON válido não foi encontrado na resposta da IA.");
        }
        const jsonString = rawText.substring(startIndex, endIndex + 1);
        const jsonData = JSON.parse(jsonString);
        return res.status(200).json({ interpretationType: 'structured', data: jsonData });
      } catch (e) {
        console.error("LOG: Falha ao extrair/parse JSON no Tarot Controller.", { error: e.message, rawText });
        return res.status(200).json({ interpretationType: 'simple', data: { mainInterpretation: "Erro formatando: " + rawText, cardInterpretations: [] } });
      }
    } else {
      // Este 'else' agora é apenas um fallback extremo
      console.warn(`[Tarot Controller] WARN: Resposta para '${spreadType}' não processada como JSON.`);
      return res.status(200).json({ interpretationType: 'simple', data: { mainInterpretation: rawText, cardInterpretations: [] } });
    }

  } catch (error) {
    console.error("LOG: Erro em generateTarotReading:", error);
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
    }
    return res.status(500).json({ error: 'Falha ao processar a leitura do Tarot.' });
  }
};

// --- Lógica para o Chat ---
export const getChatResponse = async (req, res) => {
  try {
    const { userMessage, chatContext } = req.body;
    if (!userMessage || !chatContext) {
      return res.status(400).json({ error: 'Mensagem e contexto são necessários.' });
    }

    const prompt = `
      Você é uma cartomante sábia. O CONTEXTO DA LEITURA É: "${chatContext}".
      O consulente tem uma dúvida sobre a leitura. A pergunta dele é: "${userMessage}".
      Responda à pergunta de forma clara, curta, objetiva e empática, se baseando no contexto.
    `;

    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();
    res.status(200).json({ aiResponse });

  } catch (error) {
    console.error("LOG: Erro em getChatResponse:", error);
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
    }
    res.status(500).json({ error: 'Falha ao processar a mensagem do chat.' });
  }
};

// --- Lógica para Significado Didático ---
export const getDidacticMeaning = async (req, res) => {
  try {
    const { cardName, cardOrientation, positionName } = req.body;
    if (!cardName || !cardOrientation || !positionName) {
      return res.status(400).json({ error: 'Dados da carta são necessários.' });
    }

    const prompt = `
      Aja como um professor de Tarot. Explique de forma didática o que a carta "${cardName}" (${cardOrientation}) significa arquetipicamente na posição "${positionName}" de uma Cruz Celta.
      A resposta deve ser curta e geral (2-3 frases), sem mencionar uma pergunta específica do consulente.
    `;

    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const didacticText = result.response.text();
    res.status(200).json({ didacticText });

  } catch (error) {
    console.error("LOG: Erro em getDidacticMeaning:", error);
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
    }
    res.status(500).json({ error: 'Falha ao obter significado da carta.' });
  }
};
