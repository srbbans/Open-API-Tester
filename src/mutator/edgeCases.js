/**
 * Generate edge case mutations - empty body, boundary values, injection payloads.
 */

import { walkFields, cloneAndSet } from './index.js';

export function generateEdgeCases(body) {
  const fields = walkFields(body);
  const mutations = [];

  // Empty body
  mutations.push({
    category: 'emptyBody',
    description: 'Send completely empty body (null)',
    mutatedBody: null,
  });

  // Empty object
  mutations.push({
    category: 'emptyBody',
    description: 'Send empty object {}',
    mutatedBody: {},
  });

  // Boundary values for numeric fields
  for (const field of fields) {
    if (field.type === 'number') {
      // Very large number
      mutations.push({
        category: 'boundaryValue',
        description: `Set "${field.path}" to very large number`,
        mutatedBody: cloneAndSet(body, field.path, Number.MAX_SAFE_INTEGER),
        fieldPath: field.path,
      });

      // Negative number
      mutations.push({
        category: 'boundaryValue',
        description: `Set "${field.path}" to negative number`,
        mutatedBody: cloneAndSet(body, field.path, -1),
        fieldPath: field.path,
      });

      // Decimal
      mutations.push({
        category: 'boundaryValue',
        description: `Set "${field.path}" to decimal 0.5`,
        mutatedBody: cloneAndSet(body, field.path, 0.5),
        fieldPath: field.path,
      });
    }

    if (field.type === 'string') {
      // Very long string
      mutations.push({
        category: 'boundaryValue',
        description: `Set "${field.path}" to very long string (1000 chars)`,
        mutatedBody: cloneAndSet(body, field.path, 'A'.repeat(1000)),
        fieldPath: field.path,
      });

      // SQL injection pattern
      mutations.push({
        category: 'sqlInjection',
        description: `SQL injection test on "${field.path}"`,
        mutatedBody: cloneAndSet(body, field.path, "'; DROP TABLE users; --"),
        fieldPath: field.path,
      });

      // XSS pattern
      mutations.push({
        category: 'xssPayload',
        description: `XSS payload test on "${field.path}"`,
        mutatedBody: cloneAndSet(body, field.path, '<script>alert("xss")</script>'),
        fieldPath: field.path,
      });

      // Special characters
      mutations.push({
        category: 'boundaryValue',
        description: `Set "${field.path}" to special characters`,
        mutatedBody: cloneAndSet(body, field.path, '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`'),
        fieldPath: field.path,
      });

      // Unicode
      mutations.push({
        category: 'boundaryValue',
        description: `Set "${field.path}" to unicode characters`,
        mutatedBody: cloneAndSet(body, field.path, '日本語テスト 🎉 émojis àccénts'),
        fieldPath: field.path,
      });
    }
  }

  return mutations;
}
