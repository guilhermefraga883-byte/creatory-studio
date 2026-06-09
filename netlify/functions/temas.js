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

  const queryMap = {
    'Itália — notícias, eventos, curiosidades das últimas 48 horas':
      'Qual é a notícia, evento ou fato mais comentado sobre a Itália nas últimas 48 horas? Quero uma história completa: quem são os personagens envolvidos, o que aconteceu exatamente, quando aconteceu, qual foi a reação das pessoas, qual detalhe surpreendeu todo mundo, existe algum número ou dado concreto que impressiona? Foco em fatos que brasileiros descendentes de italianos achariam fascinantes.',

    'Papa e Vaticano — o que está acontecendo na Igreja Católica agora':
      'Qual é o acontecimento mais recente e comentado sobre o Papa, o Vaticano ou a Igreja Católica nos últimos 2-3 dias? Quero detalhes completos: o que o Papa disse ou fez, qual foi a reação, existe algum contexto histórico que torna isso ainda mais interessante, qual foi o detalhe que surpreendeu as pessoas, números ou dados concretos se houver.',

    'Descendência italiana no Brasil — histórias, raízes, cultura preservada':
      'Qual é o assunto mais comentado atualmente sobre descendência italiana no Brasil ou imigração italiana? Quero uma história com detalhes: quem são as pessoas envolvidas, o que aconteceu, qual detalhe emocional ou surpreendente existe nessa história, existe algum dado sobre os 30 milhões de descendentes italianos no Brasil que seja impressionante agora.',

    'Estilo de vida italiano — longevidade, bem-viver, dolce vita, hábitos':
      'Qual é o estudo, notícia ou tendência mais recente sobre longevidade italiana, hábitos dos italianos ou estilo de vida na Itália? Quero detalhes completos: o que foi descoberto ou revelado, quais são os números concretos, quem são as pessoas ou regiões envolvidas, qual é o detalhe contraintuitivo que surpreende todo mundo, como isso se conecta com a vida cotidiana.',

    'Hacks de aprendizado de idioma — descobertas sobre como o cérebro aprende':
      'Qual é a descoberta, estudo ou notícia mais recente sobre aprendizado de idiomas, neurociência do aprendizado ou métodos eficazes para aprender línguas em idade adulta? Quero detalhes completos: o que foi descoberto, quais são os números ou dados concretos, quem fez o estudo, qual é o resultado surpreendente, como isso prova que aprender italiano depois dos 50 é possível.',

    'Catolicismo — fatos, eventos, personagens, história recente':
      'Qual é o fato, evento ou personagem mais comentado do catolicismo no Brasil e no mundo nos últimos dias? Quero uma história completa com detalhes: quem é a pessoa ou qual é o evento, o que aconteceu, qual foi a reação, existe algum detalhe histórico ou surpreendente que torna isso ainda mais interessante, números concretos se houver.'
  };

  const query = queryMap[categoria] ||
    'Qual é o assunto mais comentado sobre Itália, cultura italiana ou descendência italiana no Brasil nas últimas 48 horas? Quero detalhes completos com personagens, fatos verificáveis e dados concretos.';

  const instrucao = `${query}

Responda EXATAMENTE neste formato para 3 assuntos diferentes:

ASSUNTO: [título impactante com no máximo 12 palavras]
CONTEXTO_CURTO: [1 frase resumindo o que é]
HISTORIA_COMPLETA: [narrativa detalhada de 5-8 frases com: personagens envolvidos, cronologia do que aconteceu, detalhes específicos que prendem atenção, números ou dados concretos, o detalhe surpreendente ou contraintuitivo que a maioria não sabe, qual foi a reação das pessoas]
ANGULO: [1 frase sobre o ângulo mais forte para criar conteúdo sobre isso]
FONTE: [nome do veículo onde você encontrou]
---

Use apenas fatos verificáveis e recentes. Não invente. Seja específico e detalhado na HISTORIA_COMPLETA.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PPLX_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        max_tokens: 1500,
        messages: [{ role: 'user', content: instrucao }]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    const blocos = text.split('---').filter(b => b.trim());
    const temas = blocos.map(b => {
      const assuntoMatch = b.match(/ASSUNTO:\s*(.+)/i);
      const contextoMatch = b.match(/CONTEXTO_CURTO:\s*(.+)/i);
      const historiaMatch = b.match(/HISTORIA_COMPLETA:\s*([\s\S]+?)(?=ANGULO:|FONTE:|$)/i);
      const anguloMatch = b.match(/ANGULO:\s*(.+)/i);
      const fonteMatch = b.match(/FONTE:\s*(.+)/i);
      if (!assuntoMatch) return null;
      return {
        titulo: assuntoMatch[1].trim(),
        contexto: contextoMatch ? contextoMatch[1].trim() : '',
        historia: historiaMatch ? historiaMatch[1].trim().replace(/\n/g, ' ') : '',
        angulo: anguloMatch ? anguloMatch[1].trim() : '',
        fonte: fonteMatch ? fonteMatch[1].trim() : ''
      };
    }).filter(Boolean).slice(0, 3);

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
