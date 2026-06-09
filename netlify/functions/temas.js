exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const PPLX_KEY = process.env.PERPLEXITY_KEY;
  if (!PPLX_KEY) {
    return { statusCode: 200, headers, body: JSON.stringify({ temas: [] }) };
  }

  const params = event.queryStringParameters || {};
  const categoria = params.categoria || '';

  // Queries específicas e cirúrgicas por categoria
  const queryMap = {
    'Itália — notícias, eventos, curiosidades das últimas 48 horas':
      'Quais são as notícias, eventos ou fatos mais comentados sobre a Itália nas últimas 48 horas? Inclua acontecimentos culturais, políticos, esportivos ou curiosidades virais. Foco em conteúdo que brasileiros descendentes de italianos achariam interessante.',

    'Papa e Vaticano — o que está acontecendo na Igreja Católica agora':
      'Quais são os acontecimentos mais recentes e comentados sobre o Papa, o Vaticano ou a Igreja Católica nos últimos 2-3 dias? Inclua declarações do Papa, eventos no Vaticano, decisões da Igreja ou fatos históricos recentes.',

    'Descendência italiana no Brasil — histórias, raízes, cultura preservada':
      'Quais são os assuntos mais comentados atualmente sobre descendência italiana no Brasil, imigração italiana, colonização italiana no sul do Brasil, ou comunidades ítalo-brasileiras? Inclua eventos, datas comemorativas, descobertas históricas ou histórias virais.',

    'Estilo de vida italiano — longevidade, bem-viver, dolce vita, hábitos':
      'Quais estudos, notícias ou tendências recentes falam sobre o estilo de vida italiano, longevidade dos italianos, hábitos saudáveis da Itália, dolce vita ou bem-viver à italiana? Inclua pesquisas recentes, regiões como Sardenha ou Cilento conhecidas por longevidade.',

    'Hacks de aprendizado de idioma — descobertas sobre como o cérebro aprende':
      'Quais são as descobertas mais recentes sobre aprendizado de idiomas, neurociência do aprendizado, métodos eficazes para aprender línguas ou estudos sobre aprendizado em idade adulta? Foco em conteúdo que mostre que aprender idioma é possível em qualquer idade.',

    'Catolicismo — fatos, eventos, personagens, história recente':
      'Quais são os fatos, eventos ou personagens mais comentados do catolicismo no Brasil e no mundo nos últimos dias? Inclua santos, celebrações, declarações de bispos ou eventos da Igreja no Brasil.'
  };

  const prompt = queryMap[categoria] ||
    'Quais são os assuntos mais comentados sobre Itália, cultura italiana ou descendência italiana no Brasil nas últimas 48 horas?';

  const instrucao = `${prompt}

Para cada assunto encontrado, responda EXATAMENTE neste formato:

ASSUNTO: [título impactante com no máximo 12 palavras]
CONTEXTO: [2-3 frases explicando o que aconteceu, por que está em alta agora, dados concretos se houver]
FONTE: [nome do veículo ou plataforma onde você encontrou]
---

Liste 4 assuntos diferentes. Use apenas fatos verificáveis e recentes. Não invente.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PPLX_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        max_tokens: 800,
        messages: [{ role: 'user', content: instrucao }]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // Parse formato ASSUNTO/CONTEXTO/FONTE
    const blocos = text.split('---').filter(b => b.trim());
    const temas = blocos.map(b => {
      const assuntoMatch = b.match(/ASSUNTO:\s*(.+)/i);
      const contextoMatch = b.match(/CONTEXTO:\s*([\s\S]+?)(?=FONTE:|$)/i);
      const fonteMatch = b.match(/FONTE:\s*(.+)/i);
      if (!assuntoMatch) return null;
      return {
        titulo: assuntoMatch[1].trim(),
        contexto: contextoMatch ? contextoMatch[1].trim().replace(/\n/g, ' ') : '',
        fonte: fonteMatch ? fonteMatch[1].trim() : ''
      };
    }).filter(Boolean).slice(0, 4);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ temas })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ temas: [], erro: err.message })
    };
  }
};
