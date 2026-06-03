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

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PPLX_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: 'Liste 6 temas específicos e ATUAIS de hoje sobre aprendizado de italiano, cultura italiana, viagens para a Itália ou gastronomia italiana que estão em alta nas redes sociais agora em 2026. Para cada tema escreva apenas uma frase curta (máx 12 palavras). Retorne somente uma lista numerada, sem explicações.'
        }]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const temas = text.split('\n')
      .filter(l => l.trim())
      .map(l => l.replace(/^\d+\.\s*/, ''))
      .filter(l => l.length > 10)
      .slice(0, 6);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ temas })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
