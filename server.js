/**
 * Open API Tester - Express Server
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCurl } from './src/parser/curlParser.js';
import { runTests, previewMutations } from './src/runner/testRunner.js';
import { buildReportHTML } from './src/report/reportGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- cURL Parser ---
app.post('/api/parse-curl', (req, res) => {
  try {
    const { curl } = req.body;
    if (!curl) return res.status(400).json({ error: 'cURL string required' });
    const parsed = parseCurl(curl);
    res.json(parsed);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Preview Mutations ---
app.post('/api/preview-mutations', (req, res) => {
  try {
    const { body, mutationConfig } = req.body;
    const mutations = previewMutations(body, mutationConfig || {});
    res.json({ count: mutations.length, mutations });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Run Tests ---
const activeRuns = new Map();

app.post('/api/run-tests', async (req, res) => {
  try {
    const { request, config } = req.body;

    if (!request?.url) return res.status(400).json({ error: 'Request URL required' });

    const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    activeRuns.set(runId, { progress: 0, total: 0, status: 'running' });

    const onProgress = (current, total, result) => {
      activeRuns.set(runId, { progress: current, total, status: 'running', lastResult: result.description });
    };

    const report = await runTests(request, config || {}, onProgress);

    activeRuns.set(runId, { progress: report.summary.total, total: report.summary.total, status: 'done' });

    res.json({
      runId,
      summary: report.summary,
      results: report.results,
      startTime: report.startTime,
      endTime: report.endTime,
    });

    // Clean up after 5 minutes
    setTimeout(() => activeRuns.delete(runId), 300000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Progress ---
app.get('/api/progress/:runId', (req, res) => {
  const run = activeRuns.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

// --- Report Download ---
app.post('/api/report/generate', (req, res) => {
  try {
    const report = req.body;
    const html = buildReportHTML(report);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="api-test-report.html"');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Open API Tester running at http://localhost:${PORT}\n`);
});
