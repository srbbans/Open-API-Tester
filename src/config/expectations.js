/**
 * Default expected HTTP status codes per mutation category.
 */

export const defaultExpectations = {
  baseline: 200,
  fieldRemoved: 400,
  fieldNull: 400,
  fieldEmpty: 400,
  wrongType: 400,
  extraField: 200,
  emptyBody: 400,
  arrayEmpty: 400,
  arrayWrongType: 400,
  boundaryValue: 400,
  sqlInjection: 400,
  xssPayload: 400
};

/**
 * Merge user overrides with defaults.
 * @param {object} userOverrides - { categoryName: statusCode } or { "field.path": { categoryName: statusCode } }
 * @returns {object} Merged expectations
 */
export function mergeExpectations(userOverrides = {}) {
  return { ...defaultExpectations, ...userOverrides };
}

/**
 * Get expected status for a specific mutation.
 */
export function getExpectedStatus(category, fieldPath, expectations, fieldOverrides = {}) {
  // Check field-specific override first
  if (fieldPath && fieldOverrides[fieldPath] && fieldOverrides[fieldPath][category] !== undefined) {
    return fieldOverrides[fieldPath][category];
  }
  return expectations[category] ?? 400;
}
