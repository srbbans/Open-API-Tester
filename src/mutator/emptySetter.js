/**
 * Generate mutations that set each field to empty string/array/object.
 */

import { walkFields, cloneAndSet } from './index.js';

export function generateEmptySetters(body) {
  const fields = walkFields(body);
  const mutations = [];

  for (const field of fields) {
    let emptyValue;

    switch (field.type) {
      case 'string':
        if (field.value === '') continue;
        emptyValue = '';
        break;
      case 'array':
        if (field.value.length === 0) continue;
        emptyValue = [];
        break;
      case 'object':
        if (Object.keys(field.value).length === 0) continue;
        emptyValue = {};
        break;
      case 'number':
        emptyValue = 0;
        break;
      case 'boolean':
        emptyValue = false;
        break;
      default:
        emptyValue = '';
    }

    mutations.push({
      category: 'fieldEmpty',
      description: `Set "${field.path}" to empty (${JSON.stringify(emptyValue)})`,
      mutatedBody: cloneAndSet(body, field.path, emptyValue),
      fieldPath: field.path,
    });
  }

  return mutations;
}
