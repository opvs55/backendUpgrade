// utils/numerologyHelpers.js

// Função auxiliar para reduzir números na numerologia (sem alterações)
export const reduceNumber = (num) => {
  let numStr = String(num);
  if (numStr === '11' || numStr === '22' || numStr === '33') {
    return parseInt(numStr, 10);
  }
  let sum = 0;
  while (numStr.length > 1) {
    sum = 0;
    for (let digit of numStr) {
      sum += parseInt(digit, 10);
    }
    numStr = String(sum);
    if (numStr === '11' || numStr === '22' || numStr === '33') {
      return parseInt(numStr, 10);
    }
  }
  return parseInt(numStr, 10);
};

// <<< TEXTOS EXPANDIDOS PARA CAMINHO DE VIDA >>>
export const lifePathMeanings = {
  1: `**Pioneiro e Líder Independente:** Seu caminho é marcado pela originalidade, ambição e forte desejo de liderar. Você possui uma força interior que o impulsiona a iniciar projetos e abrir novos caminhos. A independência é crucial para você.
    * **Luz:** Coragem, determinação, inovação, autoconfiança.
    * **Sombra:** Impaciência, teimosia, autoritarismo, dificuldade em seguir.
    * **Missão:** Aprender a usar sua força para liderar com inspiração, desenvolver a autoconfiança sem arrogância e confiar na sua voz interior.`,
  2: `**Diplomata Cooperativo e Sensível:** Sua jornada envolve parcerias, harmonia e diplomacia. Você tem uma natureza gentil e intuitiva, buscando equilibrar energias e promover a cooperação. É um excelente ouvinte e mediador.
    * **Luz:** Cooperação, paciência, intuição, empatia, tato.
    * **Sombra:** Indecisão, dependência, hipersensibilidade, medo de confronto.
    * **Missão:** Aprender a colaborar sem perder sua identidade, desenvolver a paciência e a confiança na sua intuição, e usar sua sensibilidade para curar e unir.`,
  3: `**Comunicador Criativo e Expressivo:** Seu caminho é o da expressão, comunicação e criatividade. Você possui um dom natural para inspirar e alegrar os outros através das palavras, da arte ou do seu otimismo contagiante. A alegria de viver é sua marca.
    * **Luz:** Criatividade, otimismo, sociabilidade, expressão artística, bom humor.
    * **Sombra:** Superficialidade, dispersão, drama excessivo, dificuldade em focar.
    * **Missão:** Aprender a usar sua criatividade de forma construtiva, comunicar seus sentimentos autenticamente, encontrar alegria na jornada e focar sua energia expressiva.`,
  4: `**Construtor Prático e Organizado:** Sua jornada é focada na estrutura, estabilidade e trabalho árduo. Você é a base sólida, o organizador nato, buscando segurança e disciplina para construir algo duradouro. A praticidade guia seus passos.
    * **Luz:** Organização, disciplina, lealdade, praticidade, perseverança.
    * **Sombra:** Rigidez, teimosia, limitação autoimposta, medo do novo, excesso de controle.
    * **Missão:** Aprender a construir bases sólidas com flexibilidade, encontrar segurança na disciplina sem se tornar rígido, e usar sua capacidade de trabalho para manifestar objetivos concretos.`,
  5: `**Aventureiro Versátil e Amante da Liberdade:** Seu caminho é marcado pela mudança, liberdade e busca por experiências variadas. Você é adaptável, curioso e inquieto, precisando de movimento e variedade para se sentir vivo. A aventura chama por você.
    * **Luz:** Versatilidade, adaptabilidade, curiosidade, magnetismo, espírito livre.
    * **Sombra:** Inconstância, impulsividade, excessos, medo de compromisso, impaciência.
    * **Missão:** Aprender a usar sua liberdade com responsabilidade, encontrar o equilíbrio entre aventura e disciplina, adaptar-se às mudanças e abraçar a diversidade da vida.`,
  6: `**Nutridor Responsável e Harmonizador:** Sua jornada envolve o serviço, a responsabilidade (especialmente familiar) e a busca pela harmonia e beleza. Você tem um coração generoso, buscando cuidar, aconselhar e criar ambientes equilibrados. O amor e o lar são centrais.
    * **Luz:** Responsabilidade, compaixão, senso de justiça, protetor, orientador.
    * **Sombra:** Perfeccionismo, intromissão, ansiedade, teimosia, sacrifício excessivo.
    * **Missão:** Aprender a cuidar dos outros sem se anular, encontrar o equilíbrio entre dar e receber, aceitar a imperfeição (sua e dos outros) e criar beleza e harmonia ao seu redor.`,
  7: `**Buscador Sábio e Introspectivo:** Seu caminho é o do conhecimento, introspecção e busca pela verdade interior. Você possui uma mente analítica e intuitiva, sentindo-se atraído pelo mistério, pela filosofia e pela espiritualidade. Precisa de tempo sozinho para refletir.
    * **Luz:** Sabedoria, intuição, análise profunda, especialização, espiritualidade.
    * **Sombra:** Isolamento, ceticismo excessivo, frieza emocional, dificuldade em confiar, melancolia.
    * **Missão:** Aprender a confiar na sua intuição tanto quanto na sua mente, partilhar sua sabedoria sem se isolar, encontrar a conexão entre o mundo interior e exterior, e buscar a verdade com fé.`,
  8: `**Realizador Poderoso e Ambicioso:** Sua jornada envolve poder, sucesso material, autoridade e realização no mundo concreto. Você tem uma grande força de vontade, capacidade de liderança executiva e busca por reconhecimento e controle. O mundo material é seu campo de atuação.
    * **Luz:** Ambição, liderança, organização, justiça (material), força, capacidade de realização.
    * **Sombra:** Materialismo excessivo, autoritarismo, intolerância, obsessão por controle, impaciência.
    * **Missão:** Aprender a usar o poder com ética e responsabilidade, equilibrar o material e o espiritual, buscar o sucesso com integridade e liderar pelo exemplo.`,
  9: `**Humanitário Compassivo e Universalista:** Seu caminho é o da compaixão, do serviço à humanidade e da conclusão de ciclos. Você possui uma visão ampla e um coração generoso, buscando inspirar e ajudar os outros em larga escala. A empatia e o desapego são temas importantes.
    * **Luz:** Compaixão, generosidade, idealismo, tolerância, visão ampla, carisma.
    * **Sombra:** Idealismo impraticável, ressentimento, sacrifício excessivo, dificuldade em deixar ir, drama emocional.
    * **Missão:** Aprender a servir sem se esgotar, praticar o desapego com amor, perdoar (a si e aos outros), inspirar através da compaixão e abraçar a conclusão de ciclos como parte da vida.`,
  11: `**Mestre Intuitivo e Inspirador (11/2):** Como um 11, você possui a sensibilidade e cooperação do 2, mas amplificadas a um nível espiritual. Sua intuição é um farol, e seu caminho envolve inspirar os outros através de ideais elevados. Você é um canal para a consciência superior.
    * **Luz:** Intuição aguçada, inspiração, idealismo, carisma espiritual, mediunidade (potencial).
    * **Sombra:** Tensão nervosa, impaciência (conflito 1+1), idealismo impraticável, isolamento, sensibilidade extrema.
    * **Missão:** Aprender a confiar e a usar sua intuição elevada, encontrar formas práticas de manifestar seus ideais, equilibrar o mundo espiritual com o material e inspirar a humanidade.`,
  22: `**Mestre Construtor Prático (22/4):** Como um 22, você possui a disciplina e a praticidade do 4, mas com um potencial imenso para realizar grandes obras que beneficiem muitos. Você é capaz de transformar sonhos e ideais elevados em realidade concreta.
    * **Luz:** Poder de manifestação, liderança prática, visão ampla, disciplina, grandes realizações.
    * **Sombra:** Teimosia (4), pressão excessiva, medo do fracasso, potencial não realizado, uso do poder para fins egoístas.
    * **Missão:** Aprender a usar seu poder de construção para o bem maior, unir visão espiritual com ação prática, perseverar diante de grandes desafios e deixar um legado duradouro.`,
  33: `**Mestre Servidor Compassivo (33/6):** Como um 33, você carrega a responsabilidade e o amor do 6, elevados a um nível de compaixão universal. Seu caminho é o do serviço abnegado, da cura e da elevação da consciência através do amor incondicional. É considerado o "Mestre dos Mestres". (Nota: Alguns numerólogos só consideram o 33 se ele aparecer como resultado final, não em somas parciais).
    * **Luz:** Compaixão universal, altruísmo, cura, inspiração artística, mestre professor.
    * **Sombra:** Responsabilidade esmagadora, perfeccionismo (6), intromissão, tendência ao martírio, dificuldade em cuidar de si.
    * **Missão:** Aprender a servir com alegria e desapego, equilibrar o cuidado com os outros e o autocuidado, usar seus dons de cura e inspiração para elevar a vibração do planeta, e expressar o amor incondicional.`,
};

// <<< NOVOS TEXTOS PARA NÚMERO DO ANIVERSÁRIO >>>
export const birthdayNumberMeanings = {
  1: "Independência e iniciativa marcam sua abordagem.",
  2: "Diplomacia e cooperação são talentos naturais.",
  3: "Criatividade e comunicação fluem facilmente.",
  4: "Praticidade e organização definem seu estilo.",
  5: "Versatilidade e desejo de liberdade impulsionam você.",
  6: "Responsabilidade e cuidado com os outros são importantes.",
  7: "Introspecção e análise são parte da sua essência.",
  8: "Ambição e capacidade de liderança se destacam.",
  9: "Compaixão e visão ampla guiam suas ações.",
  10: "Potencial de liderança (1) com um toque de totalidade (0).", // 1+0=1
  11: "Intuição aguçada e sensibilidade elevada (Mestre).",
  12: "Combina criatividade (3) com cooperação (1+2).", // 1+2=3
  13: "Trabalho árduo (4) com necessidade de transformação (13).", // 1+3=4
  14: "Busca por liberdade (5) através de experiências (14).", // 1+4=5
  15: "Responsabilidade (6) com forte magnetismo pessoal (15).", // 1+5=6
  16: "Introspecção (7) com necessidade de superar desafios (16).", // 1+6=7
  17: "Potencial de sucesso (8) com fé e inspiração (17).", // 1+7=8
  18: "Humanitarismo (9) com desafios emocionais a superar (18).", // 1+8=9
  19: "Liderança (1) com grande potencial de realização (19).", // 1+9=10 => 1
  20: "Sensibilidade (2) e busca por harmonia em grupo (20).", // 2+0=2
  21: "Sucesso através da comunicação (3) e sociabilidade (21).", // 2+1=3
  22: "Mestre construtor, grande potencial prático (Mestre).",
  23: "Versatilidade (5) com charme e comunicação (23).", // 2+3=5
  24: "Responsabilidade (6) no trabalho e na família (24).", // 2+4=6
  25: "Introspecção (7) combinada com curiosidade (25).", // 2+5=7
  26: "Sucesso material (8) através de parcerias (26).", // 2+6=8
  27: "Compaixão (9) com forte intuição (27).", // 2+7=9
  28: "Liderança (1) com forte desejo de independência (28).", // 2+8=10 => 1
  29: "Intuição elevada (11/2) com desafios emocionais (29).", // 2+9=11 => 2
  30: "Criatividade (3) e expressão artística amplificadas (30).", // 3+0=3
  31: "Praticidade (4) com forte determinação (31).", // 3+1=4
}; // Nota: 33 não é usualmente considerado como Número de Aniversário isolado.
