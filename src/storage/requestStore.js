/**
 * Save/load/manage API request configurations.
 */

import fs from 'node:fs';
import path from 'node:path';

const SAVED_DIR = path.resolve('saved');

function ensureDir() {
  if (!fs.existsSync(SAVED_DIR)) {
    fs.mkdirSync(SAVED_DIR, { recursive: true });
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Save a request configuration.
 */
export function saveRequest(name, data) {
  ensureDir();
  const filename = `${slugify(name)}.json`;
  const filepath = path.join(SAVED_DIR, filename);

  const record = {
    name,
    filename,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    request: {
      url: data.url,
      method: data.method,
      headers: data.headers,
      body: data.body,
    },
    expectations: data.expectations || {},
    fieldOverrides: data.fieldOverrides || {},
    mutationConfig: data.mutationConfig || {},
  };

  // If file exists, preserve createdAt
  if (fs.existsSync(filepath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      record.createdAt = existing.createdAt;
    } catch { /* ignore */ }
  }

  fs.writeFileSync(filepath, JSON.stringify(record, null, 2));
  return record;
}

/**
 * Load a saved request by name/slug.
 */
export function loadRequest(nameOrSlug) {
  ensureDir();
  const slug = slugify(nameOrSlug);
  const filepath = path.join(SAVED_DIR, `${slug}.json`);

  if (!fs.existsSync(filepath)) {
    // Try exact filename
    const exactPath = path.join(SAVED_DIR, nameOrSlug);
    if (fs.existsSync(exactPath)) {
      return JSON.parse(fs.readFileSync(exactPath, 'utf8'));
    }
    throw new Error(`Request "${nameOrSlug}" not found`);
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * List all saved requests.
 */
export function listRequests() {
  ensureDir();
  const files = fs.readdirSync(SAVED_DIR).filter(f => f.endsWith('.json'));

  return files.map(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(SAVED_DIR, f), 'utf8'));
      return {
        name: data.name,
        filename: f,
        url: data.request?.url,
        method: data.request?.method,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch {
      return { name: f, filename: f, error: 'Could not parse' };
    }
  });
}

/**
 * Delete a saved request.
 */
export function deleteRequest(nameOrSlug) {
  ensureDir();
  const slug = slugify(nameOrSlug);
  const filepath = path.join(SAVED_DIR, `${slug}.json`);

  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  throw new Error(`Request "${nameOrSlug}" not found`);
}

/**
 * Import multiple requests from a JSON array.
 */
export function importRequests(requestsArray) {
  const results = [];
  for (const req of requestsArray) {
    try {
      const saved = saveRequest(req.name, req);
      results.push({ name: req.name, success: true });
    } catch (err) {
      results.push({ name: req.name, success: false, error: err.message });
    }
  }
  return results;
}

/**
 * Export all requests as a JSON array.
 */
export function exportAllRequests() {
  ensureDir();
  const files = fs.readdirSync(SAVED_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(SAVED_DIR, f), 'utf8')));
}
