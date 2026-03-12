/**
 * Generate mutations that remove one field at a time.
 */

import { walkFields, cloneAndDelete } from './index.js';

export function generateFieldRemovals(body) {
  const fields = walkFields(body);
  const mutations = [];

  for (const field of fields) {
    // Only remove leaf fields and top-level objects/arrays
    if (field.type === 'object' && field.path.includes('.')) continue;

    mutations.push({
      category: 'fieldRemoved',
      description: `Remove field "${field.path}"`,
      mutatedBody: cloneAndDelete(body, field.path),
      fieldPath: field.path,
    });
  }

  return mutations;
}
