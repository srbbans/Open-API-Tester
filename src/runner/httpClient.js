/**
 * HTTP client wrapper — sends requests and captures response details.
 */

/**
 * Send an HTTP request.
 * @param {object} options
 * @param {string} options.url
 * @param {string} options.method
 * @param {object} options.headers
 * @param {object|null} options.body - The mutated body (plain JSON object)
 * @param {number} options.timeout - Timeout in ms (default 30000)
 * @returns {Promise<{status, statusText, headers, body, rawBody, sentPayload, elapsed, error}>}
 */
export async function sendRequest({ url, method, headers, body, timeout = 30000 }) {
  const startTime = Date.now();

  try {
    let requestBody = null;
    const requestHeaders = { ...headers };
    let sentPayload = null;

    if (body !== null && body !== undefined) {
      requestBody = typeof body === 'string' ? body : JSON.stringify(body);
      sentPayload = requestBody;

      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const elapsed = Date.now() - startTime;
    const rawResponseBody = await response.text();
    let responseBody = rawResponseBody;

    // Try to parse response as JSON
    try {
      responseBody = JSON.parse(rawResponseBody);
    } catch { /* keep as string */ }

    // Collect response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      rawBody: rawResponseBody,
      sentPayload,
      elapsed,
      error: null,
    };
  } catch (err) {
    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: null,
      rawBody: null,
      sentPayload: null,
      elapsed: Date.now() - startTime,
      error: err.name === 'AbortError' ? 'Request timed out' : err.message,
    };
  }
}
