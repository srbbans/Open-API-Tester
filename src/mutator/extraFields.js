/**
 * Generate mutations that add extra unknown fields.
 */

export function generateExtraFields(body) {
  const mutations = [];
  const clone = JSON.parse(JSON.stringify(body));

  // Add extra top-level field
  const topExtra = JSON.parse(JSON.stringify(body));
  topExtra['__unknown_field__'] = 'unexpected_value';
  mutations.push({
    category: 'extraField',
    description: 'Add unknown top-level field "__unknown_field__"',
    mutatedBody: topExtra,
    fieldPath: '__unknown_field__',
  });

  // Add extra numeric field
  const numExtra = JSON.parse(JSON.stringify(body));
  numExtra['__extra_number__'] = 99999;
  mutations.push({
    category: 'extraField',
    description: 'Add unknown top-level numeric field "__extra_number__"',
    mutatedBody: numExtra,
    fieldPath: '__extra_number__',
  });

  // Add extra field inside each nested object
  for (const key of Object.keys(body)) {
    if (body[key] !== null && typeof body[key] === 'object' && !Array.isArray(body[key])) {
      const nested = JSON.parse(JSON.stringify(body));
      nested[key]['__unknown_nested__'] = 'unexpected';
      mutations.push({
        category: 'extraField',
        description: `Add unknown field inside "${key}"`,
        mutatedBody: nested,
        fieldPath: `${key}.__unknown_nested__`,
      });
    }
  }

  return mutations;
}
