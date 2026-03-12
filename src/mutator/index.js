/**
 * Mutation orchestrator - generates all test mutations from a request body.
 */

import { generateFieldRemovals } from './fieldRemover.js';
import { generateNullSetters } from './nullSetter.js';
import { generateEmptySetters } from './emptySetter.js';
import { generateTypeSwitches } from './typeSwitcher.js';
import { generateExtraFields } from './extraFields.js';
import { generateArrayMutations } from './arraySwitcher.js';
import { generateEdgeCases } from './edgeCases.js';

/**
 * Walk all fields in an object recursively, yielding path and value info.
 * @param {object} obj - Object to walk
 * @param {string} parentPath - Current path prefix
 * @returns {Array<{path: string, value: any, type: string, parent: object, key: string}>}
 */
export function walkFields(obj, parentPath = '') {
  const fields = [];

  if (obj === null || typeof obj !== 'object') return fields;

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = parentPath ? `${parentPath}.${key}` : key;
    const type = Array.isArray(value) ? 'array' : typeof value;

    fields.push({ path, value, type, parent: obj, key });

    if (type === 'object' && value !== null) {
      fields.push(...walkFields(value, path));
    } else if (type === 'array' && value !== null) {
      // Walk array items that are objects
      value.forEach((item, idx) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          fields.push(...walkFields(item, `${path}[${idx}]`));
        }
      });
    }
  }

  return fields;
}

/**
 * Deep clone an object and set a value at a dot-notation path.
 * Supports array index notation like "items[0].name"
 */
export function cloneAndSet(obj, path, value) {
  const clone = JSON.parse(JSON.stringify(obj));
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = clone;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = isNaN(parts[i]) ? parts[i] : Number(parts[i]);
    current = current[part];
    if (current === undefined || current === null) return clone;
  }

  const lastPart = isNaN(parts[parts.length - 1]) ? parts[parts.length - 1] : Number(parts[parts.length - 1]);
  current[lastPart] = value;
  return clone;
}

/**
 * Deep clone an object and delete a field at a dot-notation path.
 */
export function cloneAndDelete(obj, path) {
  const clone = JSON.parse(JSON.stringify(obj));
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = clone;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = isNaN(parts[i]) ? parts[i] : Number(parts[i]);
    current = current[part];
    if (current === undefined || current === null) return clone;
  }

  const lastPart = parts[parts.length - 1];
  if (Array.isArray(current)) {
    current.splice(Number(lastPart), 1);
  } else {
    delete current[lastPart];
  }
  return clone;
}

/**
 * Generate all mutations for a given request body.
 * @param {object} body - Original JSON body
 * @param {object} config - Mutation configuration
 * @returns {Array<Mutation>}
 */
export function generateAllMutations(body, config = {}) {
  if (!body || typeof body !== 'object') {
    return [{
      id: 'edge-empty-body',
      category: 'emptyBody',
      description: 'Send request with no body',
      mutatedBody: null,
    }];
  }

  const mutations = [];
  let idCounter = 0;

  const addMutation = (m) => {
    m.id = `mut-${++idCounter}`;
    mutations.push(m);
  };

  // Baseline - original body
  addMutation({
    category: 'baseline',
    description: 'Original request body (baseline)',
    mutatedBody: JSON.parse(JSON.stringify(body)),
  });

  // Generate mutations from each strategy
  const strategies = [
    { enabled: config.fieldRemoved !== false, fn: generateFieldRemovals },
    { enabled: config.fieldNull !== false, fn: generateNullSetters },
    { enabled: config.fieldEmpty !== false, fn: generateEmptySetters },
    { enabled: config.wrongType !== false, fn: generateTypeSwitches },
    { enabled: config.extraField !== false, fn: generateExtraFields },
    { enabled: config.arrayMutations !== false, fn: generateArrayMutations },
    { enabled: config.edgeCases !== false, fn: generateEdgeCases },
  ];

  for (const strategy of strategies) {
    if (strategy.enabled) {
      const results = strategy.fn(body, config);
      results.forEach(addMutation);
    }
  }

  return mutations;
}
