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
    const system = body.system || '';
    const messages = body.messages || [];
    const max_tokens = body.max_tokens || 2000;

    // Modo chat (com histórico) ou modo gerador (prompt simples)
    const msgs = messages.length > 0 ? messages : [{ role: 'user', content: prompt }];

    if (!msgs.length || !msgs[msgs.length - 1]?.content) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: { message: 'Mensagem vazia.' } }) };
    }

    const payload = {
      model: 'claude-sonnet-4-6',
      max_tokens,
      messages: msgs
    };
    if (system) payload.system = system;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANT_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
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
