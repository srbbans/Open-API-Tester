/**
 * Parse a cURL command string into a structured request definition.
 */

function tokenize(curlStr) {
  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (let i = 0; i < curlStr.length; i++) {
    const ch = curlStr[i];

    if (escape) {
      current += ch;
      escape = false;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if ((ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

export function parseCurl(curlStr) {
  // Clean up the string
  let cleaned = curlStr.trim();
  if (cleaned.startsWith('curl')) {
    cleaned = cleaned.slice(4).trim();
  }

  const tokens = tokenize(cleaned);

  let url = '';
  let method = 'GET';
  const headers = {};
  let body = null;
  let methodExplicit = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      method = tokens[++i]?.toUpperCase() || 'GET';
      methodExplicit = true;
    } else if (token === '-H' || token === '--header') {
      const headerStr = tokens[++i] || '';
      const colonIdx = headerStr.indexOf(':');
      if (colonIdx > 0) {
        const key = headerStr.slice(0, colonIdx).trim();
        const val = headerStr.slice(colonIdx + 1).trim();
        headers[key] = val;
      }
    } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
      body = tokens[++i] || '';
      if (!methodExplicit) method = 'POST';
    } else if (token === '-k' || token === '--insecure') {
      // skip
    } else if (token === '-L' || token === '--location') {
      // skip
    } else if (token === '-v' || token === '--verbose') {
      // skip
    } else if (token === '-o' || token === '--output') {
      i++; // skip value
    } else if (token === '-b' || token === '--cookie') {
      const cookieVal = tokens[++i] || '';
      headers['Cookie'] = cookieVal;
    } else if (token === '-A' || token === '--user-agent') {
      headers['User-Agent'] = tokens[++i] || '';
    } else if (token === '--compressed') {
      // skip
    } else if (!token.startsWith('-')) {
      url = token;
    }
  }

  // Try to parse body as JSON
  let parsedBody = null;
  if (body) {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = body; // Keep as string if not valid JSON
    }
  }

  return {
    url,
    method,
    headers,
    body: parsedBody,
    rawBody: body
  };
}
