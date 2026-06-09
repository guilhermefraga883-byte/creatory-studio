const FormData = require('form-data');
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const OAI_KEY = process.env.OPENAI_KEY;
  if (!OAI_KEY) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'Chave OpenAI não configurada.' }) };
  }

  try {
    // O body vem como base64 quando é multipart
    const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    
    // Extrai o arquivo de áudio do multipart
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: 'Formato inválido.' }) };
    }

    // Encontra o conteúdo do arquivo no multipart
    const boundaryBuffer = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;
    
    while (true) {
      const idx = buffer.indexOf(boundaryBuffer, start);
      if (idx === -1) break;
      const end = buffer.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
      if (end === -1) break;
      const part = buffer.slice(idx + boundaryBuffer.length + 2, end - 2);
      parts.push(part);
      start = end;
    }

    // Pega o conteúdo do arquivo (segunda parte após o header)
    let audioBuffer = null;
    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const header = part.slice(0, headerEnd).toString();
        if (header.includes('filename')) {
          audioBuffer = part.slice(headerEnd + 4);
          break;
        }
      }
    }

    if (!audioBuffer) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: 'Arquivo de áudio não encontrado.' }) };
    }

    // Envia pro Whisper
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' });
    form.append('model', 'whisper-1');
    form.append('language', 'pt');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OAI_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify({ text: data.text || '' }) };

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: err.message, text: '' })
    };
  }
};
