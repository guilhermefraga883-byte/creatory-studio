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
    return { statusCode: 200, headers, body: JSON.stringify({ text: '', error: 'Chave OpenAI não configurada.' }) };
  }

  try {
    const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return { statusCode: 200, headers, body: JSON.stringify({ text: '', error: 'Boundary não encontrado.' }) };
    }
    const boundary = boundaryMatch[1].trim();

    // Extrai o arquivo de áudio do multipart manualmente
    const boundaryBuf = Buffer.from('--' + boundary);
    let audioBuffer = null;
    let pos = 0;

    while (pos < buffer.length) {
      const bStart = buffer.indexOf(boundaryBuf, pos);
      if (bStart === -1) break;
      const headerStart = bStart + boundaryBuf.length + 2;
      const headerEnd = buffer.indexOf('\r\n\r\n', headerStart);
      if (headerEnd === -1) break;
      const partHeader = buffer.slice(headerStart, headerEnd).toString();
      const dataStart = headerEnd + 4;
      const nextBoundary = buffer.indexOf(boundaryBuf, dataStart);
      const dataEnd = nextBoundary === -1 ? buffer.length : nextBoundary - 2;
      if (partHeader.includes('filename')) {
        audioBuffer = buffer.slice(dataStart, dataEnd);
        break;
      }
      pos = nextBoundary === -1 ? buffer.length : nextBoundary;
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ text: '', error: 'Áudio não encontrado no request.' }) };
    }

    // Monta multipart manualmente para enviar ao Whisper
    const whisperBoundary = '----WhisperBoundary' + Date.now();
    const CRLF = '\r\n';
    const partHeader = [
      '--' + whisperBoundary,
      'Content-Disposition: form-data; name="file"; filename="audio.webm"',
      'Content-Type: audio/webm',
      '',
      ''
    ].join(CRLF);
    const modelPart = [
      '--' + whisperBoundary,
      'Content-Disposition: form-data; name="model"',
      '',
      'whisper-1'
    ].join(CRLF);
    const langPart = [
      '--' + whisperBoundary,
      'Content-Disposition: form-data; name="language"',
      '',
      'pt'
    ].join(CRLF);
    const closing = CRLF + '--' + whisperBoundary + '--';

    const bodyParts = [
      Buffer.from(partHeader),
      audioBuffer,
      Buffer.from(CRLF + modelPart + CRLF + langPart + closing)
    ];
    const bodyBuffer = Buffer.concat(bodyParts);

    const https = require('https');
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + OAI_KEY,
          'Content-Type': 'multipart/form-data; boundary=' + whisperBoundary,
          'Content-Length': bodyBuffer.length
        }
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { resolve({ text: '' }); }
        });
      });
      req.on('error', reject);
      req.write(bodyBuffer);
      req.end();
    });

    return { statusCode: 200, headers, body: JSON.stringify({ text: result.text || '' }) };

  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ text: '', error: err.message }) };
  }
};
