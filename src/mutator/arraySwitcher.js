/**
 * Generate mutations for array fields.
 */

import { walkFields, cloneAndSet } from './index.js';

export function generateArrayMutations(body) {
  const fields = walkFields(body);
  const mutations = [];

  for (const field of fields) {
    if (field.type !== 'array') continue;

    // Empty array
    if (field.value.length > 0) {
      mutations.push({
        category: 'arrayEmpty',
        description: `Set "${field.path}" to empty array []`,
        mutatedBody: cloneAndSet(body, field.path, []),
        fieldPath: field.path,
      });
    }

    // Array with null item
    mutations.push({
      category: 'arrayWrongType',
      description: `Add null item to "${field.path}"`,
      mutatedBody: cloneAndSet(body, field.path, [...field.value, null]),
      fieldPath: field.path,
    });

    // Array with wrong type item
    if (field.value.length > 0) {
      const firstItem = field.value[0];
      const wrongTypeItem = typeof firstItem === 'string' ? 12345 :
        typeof firstItem === 'number' ? 'wrong_string' :
          typeof firstItem === 'object' ? 'wrong_string' : {};

      mutations.push({
        category: 'arrayWrongType',
        description: `Add wrong-type item to "${field.path}"`,
        mutatedBody: cloneAndSet(body, field.path, [...field.value, wrongTypeItem]),
        fieldPath: field.path,
      });

      // Duplicate all items (extra items)
      mutations.push({
        category: 'arrayWrongType',
        description: `Duplicate items in "${field.path}"`,
        mutatedBody: cloneAndSet(body, field.path, [...field.value, ...field.value]),
        fieldPath: field.path,
      });
    }
  }

  return mutations;
}
