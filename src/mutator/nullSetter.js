/**
 * Generate mutations that set each field to null.
 */

import { walkFields, cloneAndSet } from './index.js';

export function generateNullSetters(body) {
  const fields = walkFields(body);
  const mutations = [];

  for (const field of fields) {
    if (field.value === null) continue; // Already null

    mutations.push({
      category: 'fieldNull',
      description: `Set "${field.path}" to null`,
      mutatedBody: cloneAndSet(body, field.path, null),
      fieldPath: field.path,
    });
  }

  return mutations;
}
