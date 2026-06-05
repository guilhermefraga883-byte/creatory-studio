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
  const params = event.queryStringParameters || {};
  const query = params.query || '';
  const modo = params.modo || 'temas';

  try {
    let prompt = '';

    if (modo === 'aprofundar') {
      prompt = `Pesquise informações REAIS e ATUAIS sobre o seguinte tema para criar um roteiro de vídeo sobre italiano/Itália para redes sociais: "${query}"

Traga:
1. Fatos recentes e verificáveis sobre o tema
2. Dados ou números relevantes (se houver)
3. Por que esse tema está em alta agora
4. Ângulos interessantes ou contraintuitivos sobre o tema
5. Conexão possível com aprendizado de italiano ou cultura italiana

Seja específico e objetivo. Máximo 200 palavras.`;
    } else {
      const assunto = query
        ? `sobre "${query}" relacionado a italiano, Itália, cultura italiana ou gastronomia italiana`
        : `sobre aprendizado de italiano, cultura italiana, viagens para a Itália ou gastronomia italiana`;

      prompt = `Liste 6 temas específicos e ATUAIS de hoje ${assunto} que estão em alta nas redes sociais agora em 2026. Para cada tema escreva apenas uma frase curta (máx 12 palavras). Retorne somente uma lista numerada, sem explicações.`;
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PPLX_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        max_tokens: modo === 'aprofundar' ? 800 : 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (modo === 'aprofundar') {
      return { statusCode: 200, headers, body: JSON.stringify({ contexto: text }) };
    } else {
      const temas = text.split('\n')
        .filter(l => l.trim())
        .map(l => l.replace(/^\d+\.\s*/, ''))
        .filter(l => l.length > 10)
        .slice(0, 6);
      return { statusCode: 200, headers, body: JSON.stringify({ temas }) };
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
