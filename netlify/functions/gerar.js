exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const ANT_KEY = process.env.ANTHROPIC_KEY;
  if (!ANT_KEY) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: { message: 'Chave Anthropic não configurada no servidor.' } }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const prompt = body.prompt || '';
    if (!prompt) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: { message: 'Prompt vazio.' } }) };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANT_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};
