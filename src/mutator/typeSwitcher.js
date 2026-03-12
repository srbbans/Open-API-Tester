/**
 * Generate mutations that switch field values to wrong types.
 */

import { walkFields, cloneAndSet } from './index.js';

const TYPE_SWAPS = {
  string: [12345, true, [], {}, 0],
  number: ['text_string', true, null, '0', ''],
  boolean: ['true', 1, null, 'yes', 0],
  object: ['string_value', [], null, 42, true],
  array: ['string_value', {}, 42, null, true],
};

export function generateTypeSwitches(body) {
  const fields = walkFields(body);
  const mutations = [];

  for (const field of fields) {
    const swaps = TYPE_SWAPS[field.type];
    if (!swaps) continue;

    // Use first 2 swaps to keep mutation count reasonable
    const swapsToUse = swaps.slice(0, 2);

    for (const swapValue of swapsToUse) {
      mutations.push({
        category: 'wrongType',
        description: `Change "${field.path}" from ${field.type} to ${JSON.stringify(swapValue)}`,
        mutatedBody: cloneAndSet(body, field.path, swapValue),
        fieldPath: field.path,
      });
    }
  }

  return mutations;
}
