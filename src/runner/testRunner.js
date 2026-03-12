/**
 * Test runner - executes all mutations against the target API.
 */

import { sendRequest } from './httpClient.js';
import { generateAllMutations } from '../mutator/index.js';
import { mergeExpectations, getExpectedStatus } from '../config/expectations.js';

/**
 * Run all mutation tests.
 * @param {object} request - { url, method, headers, body }
 * @param {object} config - { expectations, concurrency, timeout, mutationConfig }
 * @param {function} onProgress - Progress callback (current, total, mutation)
 * @returns {Promise<{results, summary, request, startTime, endTime}>}
 */
export async function runTests(request, config = {}, onProgress = null) {
  const {
    expectations: userExpectations = {},
    fieldOverrides = {},
    concurrency = 5,
    timeout = 30000,
    mutationConfig = {},
  } = config;

  const expectations = mergeExpectations(userExpectations);

  const bodyToMutate = request.body;
  const mutations = generateAllMutations(bodyToMutate, mutationConfig);

  const results = [];
  const startTime = new Date().toISOString();
  let completed = 0;

  const processMutation = async (mutation) => {
    const expectedStatus = getExpectedStatus(mutation.category, mutation.fieldPath, expectations, fieldOverrides);

    const response = await sendRequest({
      url: request.url,
      method: request.method,
      headers: { ...request.headers },
      body: mutation.mutatedBody,
      timeout,
    });

    const pass = response.error ? false : response.status === expectedStatus;

    const result = {
      id: mutation.id,
      category: mutation.category,
      description: mutation.description,
      fieldPath: mutation.fieldPath || null,
      expectedStatus,
      actualStatus: response.status,
      statusText: response.statusText,
      pass,
      requestUrl: request.url,
      requestMethod: request.method,
      requestHeaders: { ...request.headers },
      mutatedBody: mutation.mutatedBody,
      sentPayload: response.sentPayload,
      responseBody: response.body,
      responseHeaders: response.headers,
      elapsed: response.elapsed,
      error: response.error,
    };

    completed++;
    if (onProgress) {
      onProgress(completed, mutations.length, result);
    }

    return result;
  };

  // Run with concurrency limit using a simple semaphore
  const semaphore = new Array(concurrency).fill(Promise.resolve());
  const allPromises = [];

  for (const mutation of mutations) {
    const idx = await Promise.race(semaphore.map((p, i) => p.then(() => i)));
    const promise = processMutation(mutation).then(result => {
      results.push(result);
      return result;
    });
    semaphore[idx] = promise;
    allPromises.push(promise);
  }

  await Promise.all(allPromises);

  // Sort results by id for consistent ordering
  results.sort((a, b) => {
    const numA = parseInt(a.id.split('-')[1]);
    const numB = parseInt(b.id.split('-')[1]);
    return numA - numB;
  });

  const endTime = new Date().toISOString();

  // Compute summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.pass).length,
    failed: results.filter(r => !r.pass).length,
    errors: results.filter(r => r.error).length,
    avgResponseTime: Math.round(results.reduce((sum, r) => sum + r.elapsed, 0) / results.length),
    byCategory: {},
  };

  for (const result of results) {
    if (!summary.byCategory[result.category]) {
      summary.byCategory[result.category] = { total: 0, passed: 0, failed: 0 };
    }
    summary.byCategory[result.category].total++;
    if (result.pass) summary.byCategory[result.category].passed++;
    else summary.byCategory[result.category].failed++;
  }

  return {
    results,
    summary,
    request: {
      url: request.url,
      method: request.method,
      headers: request.headers,
      originalBody: request.body,
    },
    startTime,
    endTime,
    expectations,
  };
}

/**
 * Generate mutations only (for preview without running).
 */
export function previewMutations(body, mutationConfig = {}) {
  return generateAllMutations(body, mutationConfig);
}
