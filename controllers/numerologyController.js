// controllers/numerologyController.js (COM PROMPT JSON)
import { reduceNumber, lifePathMeanings, birthdayNumberMeanings } from '../utils/numerologyHelpers.js';
import { createSupabaseServerClient } from '../config/supabaseClient.js';
import { genAI, geminiModelName } from '../config/gemini.js';

// --- Função Auxiliar para obter Nome do Mês (Português) ---
const getMonthName = (monthNumber) => {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  if (monthNumber >= 1 && monthNumber <= 12) {
    return months[monthNumber - 1];
  }
  return "Mês Inválido";
};

const sanitizeNumerologyResponse = (reading) => {
  if (!reading) return reading;

  const sanitizedReading = { ...reading };
  delete sanitizedReading.birthday_number;

  if (typeof sanitizedReading.birthday_secret_meaning === 'string') {
    try {
      const parsedMeaning = JSON.parse(sanitizedReading.birthday_secret_meaning);
      if (parsedMeaning && typeof parsedMeaning === 'object') {
        delete parsedMeaning.numerology_details;
        sanitizedReading.birthday_secret_meaning = JSON.stringify(parsedMeaning);
      }
    } catch (parseError) {
      console.warn('[Numerology Controller] Falha ao sanitizar birthday_secret_meaning:', parseError.message);
    }
  }

  return sanitizedReading;
};

// --- Função Principal para Calcular ou Obter Leitura ---
export const getOrCalculateNumerology = async (req, res) => {
  try {
    const { birthDate } = req.body;
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      console.warn("[Numerology Controller] Tentativa de acesso sem token Bearer válido.");
      return res.status(401).json({ error: 'Token de autenticação inválido ou ausente.' });
    }

    // Cria cliente Supabase autenticado
    let supabase;
    try {
      supabase = createSupabaseServerClient(token);
      console.log("[Numerology Controller] Cliente Supabase autenticado criado.");
    } catch (clientError) {
      console.error("[Numerology Controller] Erro ao criar cliente Supabase:", clientError.message);
      return res.status(401).json({ error: clientError.message || 'Falha ao inicializar autenticação.' });
    }

    // Obtém/Valida usuário
    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !supabaseUser) {
      console.error("[Numerology Controller] Erro ao obter usuário do Supabase com token:", userError);
      return res.status(401).json({ error: 'Não foi possível validar o usuário com o token fornecido.' });
    }
    const userId = supabaseUser.id;
    console.log(`[Numerology Controller] Requisição autenticada para user ${userId}`);


    // Busca leitura existente
    console.log(`[Numerology Controller] Verificando leitura existente para user ${userId}`);
    const { data: existingReading, error: fetchError } = await supabase
      .from('numerology_readings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error("[Numerology Controller] Erro DETALHADO ao buscar leitura existente:", fetchError);
      throw new Error('Erro ao verificar histórico.');
    }
    if (existingReading) {
      console.log(`[Numerology Controller] Leitura existente encontrada para ${userId}. Retornando.`);
      return res.status(200).json(sanitizeNumerologyResponse(existingReading));
    }

    // Validação da Data (se não encontrou e data foi enviada)
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      console.log(`[Numerology Controller] Leitura não encontrada e data inválida/ausente.`);
      return res.status(404).json({ error: 'Leitura não encontrada. Forneça data válida.' });
    }

    // --- Cálculo dos Números ---
    console.log(`[Numerology Controller] Calculando números base para user ${userId} com data ${birthDate}`);
    const [year, month, day] = birthDate.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error(`[Numerology Controller] Erro no split/map da data: Y=${year}, M=${month}, D=${day}`);
      throw new Error("Falha ao processar os componentes da data.");
    }
    const reducedDay = reduceNumber(day);
    const reducedMonth = reduceNumber(month);
    const reducedYear = reduceNumber(year);
    const lifePathNumber = reduceNumber(reducedDay + reducedMonth + reducedYear);
    const birthdayNumber = reducedDay;
    console.log(`[Numerology Controller] Números base: LP=${lifePathNumber}, BDNum=${birthdayNumber}, Dia=${day}, Mes=${month}`);

    // --- Busca Significados Básicos ---
    const lifePathMeaning = lifePathMeanings[lifePathNumber] || "Significado do Caminho de Vida não disponível.";
    const birthdayMeaning = birthdayNumberMeanings[day] || "Significado do dia de aniversário não disponível.";

    // --- <<< ALTERAÇÃO NO PROMPT DA IA PARA SIGNIFICADO SECRETO >>> ---
    let birthdaySecretMeaning = null; // Inicia como nulo (vai guardar a STRING JSON)
    try {
      console.log(`[Numerology Controller] Solicitando ANÁLISE JSON do aniversário (${day}/${month}) para IA Gemini...`);
      const monthName = getMonthName(month);

      if (monthName === "Mês Inválido") {
        console.warn(`[Numerology Controller] Mês inválido (${month}). Pulando análise da IA.`);
      } else {
        
        // <<< ESTE É O NOVO PROMPT >>>
        const birthdayPrompt = `
          Aja como um numerólogo e astrólogo combinando conhecimentos do livro "O Significado Secreto dos Aniversários" de Gary Goldschneider e Joost Elffers.
          Analise a data de nascimento: ${day} de ${monthName}.
          Sua resposta DEVE ser um objeto JSON. Não inclua saudações, despedidas, explicações ou qualquer texto fora do objeto JSON.
          O JSON deve ter EXATAMENTE a seguinte estrutura:
          {
            "archetype_title": "O Título do Arquétipo do Dia (ex: O Dia da Aparente Simplicidade)",
            "archetype_description": "Um parágrafo de 3-5 frases descrevendo a essência das pessoas nascidas neste dia. Pode usar **negrito** para ênfase.",
            "tarot_card": "Uma análise sobre a carta de Tarot associada e seu significado (ex: 'A sexta carta dos Arcanos Maiores é Os Enamorados...')",
            "advice": "Um conselho prático (ex: 'Mantenha uma vida equilibrada e tome cuidado...')",
            "strengths": ["Um Ponto Forte", "Outro Ponto Forte", "Terceiro Ponto Forte"],
            "weaknesses": ["Um Ponto Fraco", "Outro Ponto Fraco", "Terceiro Ponto Fraco"]
          }
          Use a obra de Gary Goldschneider e Joost Elffers como referência.
        `;

        const model = genAI.getGenerativeModel({ model: geminiModelName });
        console.log(`[Numerology Controller] Enviando prompt JSON para Gemini para ${day}/${monthName}...`);
        const result = await model.generateContent(birthdayPrompt);
        const response = result.response;
        let responseText = response?.text();

        if (responseText) {
          // Limpa o markdown '```json' e '```' que a IA às vezes adiciona
          if (responseText.startsWith('```json')) {
            responseText = responseText.substring(7, responseText.length - 3).trim();
          } else if (responseText.startsWith('```')) {
             responseText = responseText.substring(3, responseText.length - 3).trim();
          }

          // AQUI: Nós salvamos a *string JSON* diretamente.
          // O frontend fará o JSON.parse()
          birthdaySecretMeaning = responseText; 
          console.log(`[Numerology Controller] Resposta JSON da IA recebida (string): ${birthdaySecretMeaning.substring(0, 70)}...`);
        } else {
          console.warn(`[Numerology Controller] IA retornou resposta SEM TEXTO para o aniversário ${day}/${monthName}.`);
          birthdaySecretMeaning = `{"error": "Não foi possível gerar a análise detalhada para este dia no momento."}`; // Salva um JSON de erro
        }
      }
    } catch (aiError) {
      if (aiError?.code === 'LLM_LOCATION_UNSUPPORTED') {
        console.error('[Numerology Controller] Localização do LLM não suportada:', aiError);
        return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
      }
      console.error(`[Numerology Controller] Erro CRÍTICO ao chamar Gemini para análise JSON:`, aiError);
      birthdaySecretMeaning = `{"error": "Erro ao gerar a análise: ${aiError.message || 'Falha na IA'}"}`; // Salva um JSON de erro
    }
    // --- <<< FIM DA ALTERAÇÃO NA IA >>> ---

    // Preparar dados para inserir (INCLUI a string JSON)
    const newReadingData = {
      user_id: userId,
      input_birth_date: birthDate,
      life_path_number: lifePathNumber,
      life_path_meaning: lifePathMeaning,
      birthday_number: birthdayNumber,
      birthday_meaning: birthdayMeaning,
      birthday_secret_meaning: birthdaySecretMeaning, // <<< CAMPO AGORA GUARDA UMA STRING JSON
    };

    // --- OPERAÇÃO DE INSERT ---
    console.log(`[Numerology Controller] ===> TENTANDO INSERT em numerology_readings para user ${userId}`);
    const { data: insertedReading, error: insertError } = await supabase
      .from('numerology_readings')
      .insert(newReadingData)
      .select()
      .single();
    console.log(`[Numerology Controller] <=== INSERT em numerology_readings CONCLUÍDO.`);


    if (insertError) {
      console.error("[Numerology Controller] Erro DETALHADO ao INSERIR leitura:", insertError);
      if (insertError.code === '23505') {
        console.warn(`[Numerology Controller] Violação UNIQUE (inserção duplicada?) para user ${userId}`);
        return res.status(409).json({ error: 'Erro de concorrência: Já existe uma leitura.' });
      }
      throw new Error(`Erro ao salvar leitura (Insert): ${insertError.message}`);
    }
    console.log(`[Numerology Controller] Insert bem-sucedido, dados:`, insertedReading);


    // --- OPERAÇÃO DE UPDATE ---
    console.log(`[Numerology Controller] ===> TENTANDO UPDATE em profiles para user ${userId}`);
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ life_path_number: lifePathNumber, birthday_number: birthdayNumber })
      .eq('id', userId);
    console.log(`[Numerology Controller] <=== UPDATE em profiles CONCLUÍDO.`);


    if (profileUpdateError) {
      console.error(`[Numerology Controller] Erro DETALHADO ao ATUALIZAR perfil ${userId}:`, profileUpdateError);
      insertedReading.warning = "A leitura foi salva, mas houve um erro ao atualizar seu perfil com os números.";
    } else {
      console.log(`[Numerology Controller] Perfil ${userId} atualizado com sucesso.`);
    }

    // Retorna sucesso
    console.log(`[Numerology Controller] Retornando leitura criada com status 201 para ${userId}.`);
    return res.status(201).json(sanitizeNumerologyResponse(insertedReading));

  } catch (error) {
    console.error("[Numerology Controller] ERRO GERAL CAPTURADO em getOrCalculateNumerology:", { message: error.message, stack: error.stack });
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
    }
    return res.status(500).json({ error: error.message || 'Falha interna ao processar numerologia.' });
  }
};

// --- Função para Resetar/Apagar a Leitura (Sem alterações) ---
export const resetNumerologyReading = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) { token = authHeader.split(' ')[1]; }
    if (!token) { return res.status(401).json({ error: 'Token inválido ou ausente.' }); }

    let supabase;
    try { supabase = createSupabaseServerClient(token); }
    catch (clientError) { return res.status(401).json({ error: clientError.message || 'Falha auth.' }); }

    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !supabaseUser) { return res.status(401).json({ error: 'Usuário inválido.' }); }
    const userId = supabaseUser.id;
    console.log(`[Numerology Controller - Reset] Requisição autenticada para user ${userId}`);

    // --- OPERAÇÃO DELETE ---
    console.log(`[Numerology Controller - Reset] ===> TENTANDO DELETE em numerology_readings para user ${userId}`);
    const { error: deleteError } = await supabase
      .from('numerology_readings')
      .delete()
      .eq('user_id', userId);
    console.log(`[Numerology Controller - Reset] <=== DELETE em numerology_readings CONCLUÍDO.`);

    if (deleteError) {
      console.error(`[Numerology Controller - Reset] Erro DETALHADO ao APAGAR leitura para user ${userId}:`, deleteError);
      throw new Error(`Erro ao apagar leitura (Delete): ${deleteError.message}`);
    }
    console.log(`[Numerology Controller - Reset] Leitura apagada para user ${userId}`);

    // --- OPERAÇÃO UPDATE (Limpar Perfil) ---
    console.log(`[Numerology Controller - Reset] ===> TENTANDO UPDATE (null) em profiles para user ${userId}`);
    const { error: profileClearError } = await supabase
      .from('profiles')
      .update({ life_path_number: null, birthday_number: null })
      .eq('id', userId);
    console.log(`[Numerology Controller - Reset] <=== UPDATE (null) em profiles CONCLUÍDO.`);

    if (profileClearError) {
      console.error(`[Numerology Controller - Reset] Erro DETALHADO ao LIMPAR perfil ${userId}:`, profileClearError);
    } else {
      console.log(`[Numerology Controller - Reset] Perfil ${userId} limpo.`);
    }

    return res.status(200).json({ message: 'Leitura numerológica apagada com sucesso.' });

  } catch (error) {
    console.error("[Numerology Controller - Reset] ERRO GERAL CAPTURADO:", { message: error.message, stack: error.stack });
    return res.status(500).json({ error: error.message || 'Falha ao resetar.' });
  }
};
