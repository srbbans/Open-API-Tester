/**
 * Open API Tester - Frontend Application
 */

// ============ STATE ============
let currentResults = null;
let lastReport = null;

const MUTATION_CATEGORIES = {
  fieldRemoved: { label: 'Remove Fields', desc: 'Remove one field at a time', default: true },
  fieldNull: { label: 'Null Values', desc: 'Set fields to null', default: true },
  fieldEmpty: { label: 'Empty Values', desc: 'Set fields to empty string/array/object', default: true },
  wrongType: { label: 'Wrong Types', desc: 'Change field value types', default: true },
  extraField: { label: 'Extra Fields', desc: 'Add unknown fields', default: true },
  arrayMutations: { label: 'Array Mutations', desc: 'Modify array fields', default: true },
  edgeCases: { label: 'Edge Cases', desc: 'Boundary values, injection tests', default: true },
};

const DEFAULT_EXPECTATIONS = {
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
  xssPayload: 400,
};

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  initExpectationsGrid();
  initMutationToggles();
  loadSavedRequests();
  setupBodyValidation();
});

// ============ TABS ============
function switchMainTab(tabEl) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  tabEl.classList.add('active');
  document.getElementById('tab-' + tabEl.dataset.tab).classList.add('active');

  if (tabEl.dataset.tab === 'preview') {
    updatePreview();
  }
}

// ============ cURL PARSER ============
async function parseCurl() {
  const curlStr = document.getElementById('curlInput').value.trim();
  if (!curlStr) return toast('Please paste a cURL command', 'error');

  try {
    const res = await fetch('/api/parse-curl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curl: curlStr }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('reqMethod').value = data.method;
    document.getElementById('reqUrl').value = data.url;

    // Set headers
    const headersList = document.getElementById('headersList');
    headersList.innerHTML = '';
    for (const [key, value] of Object.entries(data.headers || {})) {
      addHeaderRow(key, value);
    }
    if (Object.keys(data.headers || {}).length === 0) {
      addHeaderRow('Content-Type', 'application/json');
    }

    // Set body
    if (data.body) {
      document.getElementById('reqBody').value =
        typeof data.body === 'object' ? JSON.stringify(data.body, null, 2) : data.body;
    }

    toast('cURL parsed successfully', 'success');
    validateBody();
  } catch (err) {
    toast('Parse error: ' + err.message, 'error');
  }
}

// ============ HEADERS ============
function addHeader() {
  addHeaderRow('', '');
}

function addHeaderRow(name, value) {
  const headersList = document.getElementById('headersList');
  const row = document.createElement('div');
  row.className = 'header-row';
  row.innerHTML = `
    <input type="text" placeholder="Header name" value="${escapeAttr(name)}">
    <input type="text" placeholder="Header value" value="${escapeAttr(value)}">
    <button class="remove-header" onclick="removeHeader(this)">&times;</button>`;
  headersList.appendChild(row);
}

function removeHeader(btn) {
  btn.closest('.header-row').remove();
}

function getHeaders() {
  const headers = {};
  document.querySelectorAll('#headersList .header-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const name = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (name) headers[name] = value;
  });
  return headers;
}

// ============ BODY ============
function setupBodyValidation() {
  document.getElementById('reqBody').addEventListener('input', () => {
    validateBody();
  });
}

function validateBody() {
  const textarea = document.getElementById('reqBody');
  const status = document.getElementById('bodyStatus');
  const raw = textarea.value.trim();

  if (!raw) {
    status.textContent = '';
    status.style.color = 'var(--text3)';
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const keys = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0;
    status.textContent = `Valid JSON - ${keys} top-level keys`;
    status.style.color = 'var(--green)';
  } catch (e) {
    status.textContent = 'Invalid JSON: ' + e.message;
    status.style.color = 'var(--red)';
  }
}

function formatBody() {
  const textarea = document.getElementById('reqBody');
  try {
    const parsed = JSON.parse(textarea.value);
    textarea.value = JSON.stringify(parsed, null, 2);
    validateBody();
    toast('JSON formatted', 'success');
  } catch (e) {
    toast('Cannot format: Invalid JSON', 'error');
  }
}

function getBody() {
  const raw = document.getElementById('reqBody').value.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// ============ EXPECTATIONS ============
function initExpectationsGrid() {
  const grid = document.getElementById('expectationsGrid');
  const labels = {
    baseline: 'Baseline (original)',
    fieldRemoved: 'Field Removed',
    fieldNull: 'Field set to Null',
    fieldEmpty: 'Field set to Empty',
    wrongType: 'Wrong Type',
    extraField: 'Extra Unknown Field',
    emptyBody: 'Empty Body',
    arrayEmpty: 'Empty Array',
    arrayWrongType: 'Array Wrong Type',
    boundaryValue: 'Boundary Values',
    sqlInjection: 'SQL Injection',
    xssPayload: 'XSS Payload',
  };

  let html = '';
  for (const [key, label] of Object.entries(labels)) {
    html += `
      <span class="cat-label">${label}</span>
      <input type="number" id="exp-${key}" value="${DEFAULT_EXPECTATIONS[key]}" min="100" max="599">`;
  }
  grid.innerHTML = html;
}

function getExpectations() {
  const expectations = {};
  for (const key of Object.keys(DEFAULT_EXPECTATIONS)) {
    const input = document.getElementById('exp-' + key);
    if (input) expectations[key] = parseInt(input.value) || DEFAULT_EXPECTATIONS[key];
  }
  return expectations;
}

// ============ MUTATION TOGGLES ============
function initMutationToggles() {
  const container = document.getElementById('mutationToggles');
  let html = '';
  for (const [key, info] of Object.entries(MUTATION_CATEGORIES)) {
    html += `
      <label class="mutation-toggle">
        <input type="checkbox" id="mut-${key}" ${info.default ? 'checked' : ''}>
        <span>${info.label}<br><small style="color:var(--text3)">${info.desc}</small></span>
      </label>`;
  }
  container.innerHTML = html;
}

function getMutationConfig() {
  const config = {};
  for (const key of Object.keys(MUTATION_CATEGORIES)) {
    const cb = document.getElementById('mut-' + key);
    if (cb) config[key] = cb.checked;
  }
  return config;
}

// ============ PREVIEW ============
function updatePreview() {
  const method = document.getElementById('reqMethod').value;
  const url = document.getElementById('reqUrl').value || '(no URL set)';
  const headers = getHeaders();
  const body = getBody();

  const previewEl = document.getElementById('requestPreview');
  previewEl.innerHTML = `
    <div class="preview-section">
      <h4>Endpoint</h4>
      <span class="preview-method method-badge ${method}">${method}</span>
      <span class="preview-url">${escapeHtml(url)}</span>
    </div>
    <div class="preview-section">
      <h4>Headers (${Object.keys(headers).length})</h4>
      <pre class="preview-code">${Object.entries(headers).map(([k, v]) => {
        const masked = (k.toLowerCase() === 'authorization' || k.toLowerCase() === 'cookie')
          ? v.slice(0, 10) + '****' : v;
        return `<span style="color:var(--cyan)">${escapeHtml(k)}</span>: ${escapeHtml(masked)}`;
      }).join('\n') || '<span style="color:var(--text3)">No headers</span>'}</pre>
    </div>
    <div class="preview-section">
      <h4>Body</h4>
      <pre class="preview-code">${body ? escapeHtml(JSON.stringify(body, null, 2)) : '<span style="color:var(--text3)">No body</span>'}</pre>
    </div>`;
}

async function previewMutations() {
  const body = getBody();
  if (!body || typeof body !== 'object') {
    document.getElementById('mutationPreview').innerHTML =
      '<div style="padding:20px;color:var(--text3);text-align:center">Enter a valid JSON body to preview mutations</div>';
    return;
  }

  try {
    const res = await fetch('/api/preview-mutations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, mutationConfig: getMutationConfig() }),
    });
    const data = await res.json();

    document.getElementById('mutationCount').textContent = `${data.count} mutations will be generated`;

    // Group by category
    const grouped = {};
    for (const m of data.mutations) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    }

    let html = '';
    for (const [cat, items] of Object.entries(grouped)) {
      html += `
        <div style="margin-bottom:8px">
          <div style="padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px"
               onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
            <span style="color:var(--text3)">&#9654;</span>
            <span style="font-weight:600">${cat}</span>
            <span style="margin-left:auto;color:var(--text2);font-size:12px">${items.length} tests</span>
          </div>
          <div style="display:none;padding:4px 0">
            ${items.map(m => `<div style="padding:6px 16px;font-size:13px;color:var(--text2);border-left:2px solid var(--border);margin:2px 0 2px 12px">${escapeHtml(m.description)}</div>`).join('')}
          </div>
        </div>`;
    }

    document.getElementById('mutationPreview').innerHTML = html;
  } catch (err) {
    toast('Preview error: ' + err.message, 'error');
  }
}

// ============ RUN TESTS ============
async function runAllTests() {
  const url = document.getElementById('reqUrl').value.trim();
  if (!url) return toast('Please enter a URL', 'error');

  const request = {
    url,
    method: document.getElementById('reqMethod').value,
    headers: getHeaders(),
    body: getBody(),
  };

  const config = {
    expectations: getExpectations(),
    concurrency: parseInt(document.getElementById('concurrency').value) || 5,
    timeout: parseInt(document.getElementById('timeout').value) || 30000,
    mutationConfig: getMutationConfig(),
  };

  // Switch to results tab
  switchMainTab(document.querySelector('[data-tab="results"]'));
  document.getElementById('noResults').style.display = 'none';
  document.getElementById('resultsContent').style.display = 'block';

  // Show progress
  const progressEl = document.getElementById('testProgress');
  progressEl.style.display = 'block';
  document.getElementById('progressText').textContent = 'Starting tests...';
  document.getElementById('progressPercent').textContent = '0%';
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('resultsSummary').innerHTML = '';
  document.getElementById('resultsTable').innerHTML = '';
  document.getElementById('filterChips').innerHTML = '';

  const runBtn = document.getElementById('runBtn');
  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="spinner"></span> Running...';

  try {
    const res = await fetch('/api/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, config }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    currentResults = data;
    lastReport = {
      results: data.results,
      summary: data.summary,
      request: { ...request, originalBody: request.body },
      startTime: data.startTime,
      endTime: data.endTime,
      expectations: config.expectations,
    };

    renderResults(data);
    toast(`Tests complete: ${data.summary.passed}/${data.summary.total} passed`, 'success');
  } catch (err) {
    toast('Test error: ' + err.message, 'error');
    document.getElementById('resultsTable').innerHTML =
      `<div style="padding:40px;text-align:center;color:var(--red)">${escapeHtml(err.message)}</div>`;
  } finally {
    progressEl.style.display = 'none';
    runBtn.disabled = false;
    runBtn.innerHTML = 'Run Tests';
  }
}

// ============ RENDER RESULTS ============
function renderResults(data) {
  const { results, summary } = data;

  // Summary cards
  const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0;
  document.getElementById('resultsSummary').innerHTML = `
    <div class="stat-card total"><div class="stat-value">${summary.total}</div><div class="stat-label">Total Tests</div></div>
    <div class="stat-card pass"><div class="stat-value">${summary.passed}</div><div class="stat-label">Passed</div></div>
    <div class="stat-card fail"><div class="stat-value">${summary.failed}</div><div class="stat-label">Failed</div></div>
    <div class="stat-card"><div class="stat-value" style="color:${passRate >= 80 ? 'var(--green)' : passRate >= 50 ? 'var(--yellow)' : 'var(--red)'}">${passRate}%</div><div class="stat-label">Pass Rate</div></div>
    <div class="stat-card time"><div class="stat-value">${summary.avgResponseTime}ms</div><div class="stat-label">Avg Response</div></div>`;

  // Progress bar
  document.getElementById('progressFill').style.width = '100%';

  // Filter chips
  const categories = [...new Set(results.map(r => r.category))];
  let activeFilter = 'all';
  let statusFilter = 'all';

  const renderFilterChips = () => {
    document.getElementById('filterChips').innerHTML = `
      <div class="chip ${activeFilter === 'all' ? 'active' : ''}" onclick="setFilter('all')">All (${results.length})</div>
      ${categories.map(c => {
        const count = results.filter(r => r.category === c).length;
        return `<div class="chip ${activeFilter === c ? 'active' : ''}" onclick="setFilter('${c}')">${c} (${count})</div>`;
      }).join('')}
      <div style="margin-left:auto;display:flex;gap:4px">
        <div class="chip ${statusFilter === 'all' ? 'active' : ''}" onclick="setStatusFilter('all')">All</div>
        <div class="chip ${statusFilter === 'pass' ? 'active' : ''}" style="${statusFilter === 'pass' ? 'border-color:var(--green);color:var(--green)' : ''}" onclick="setStatusFilter('pass')">Pass</div>
        <div class="chip ${statusFilter === 'fail' ? 'active' : ''}" style="${statusFilter === 'fail' ? 'border-color:var(--red);color:var(--red)' : ''}" onclick="setStatusFilter('fail')">Fail</div>
      </div>`;
  };

  const renderTable = () => {
    let filtered = results;
    if (activeFilter !== 'all') filtered = filtered.filter(r => r.category === activeFilter);
    if (statusFilter === 'pass') filtered = filtered.filter(r => r.pass);
    if (statusFilter === 'fail') filtered = filtered.filter(r => !r.pass);

    if (filtered.length === 0) {
      document.getElementById('resultsTable').innerHTML =
        '<div style="padding:40px;text-align:center;color:var(--text3)">No results match filters</div>';
      return;
    }

    const tableHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
        <div class="result-row" style="border-bottom:1px solid var(--border);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--text2);cursor:default">
          <span>#</span><span>Test Description</span><span>Expected</span><span>Actual</span><span>Time</span><span>Result</span>
        </div>
        ${filtered.map((r, idx) => renderResultRow(r, idx + 1)).join('')}
      </div>`;
    document.getElementById('resultsTable').innerHTML = tableHTML;
  };

  // Make filter functions global
  window.setFilter = (cat) => { activeFilter = cat; renderFilterChips(); renderTable(); };
  window.setStatusFilter = (s) => { statusFilter = s; renderFilterChips(); renderTable(); };

  renderFilterChips();
  renderTable();
}

function renderResultRow(r, num) {
  const statusClass = r.actualStatus >= 200 && r.actualStatus < 300 ? 's2xx' :
    r.actualStatus >= 400 && r.actualStatus < 500 ? 's4xx' :
    r.actualStatus >= 500 ? 's5xx' : 's0';

  const resultBadge = r.error ? '<span class="result-badge error">ERROR</span>' :
    r.pass ? '<span class="result-badge pass">PASS</span>' :
    '<span class="result-badge fail">FAIL</span>';

  const rowId = 'detail-' + r.id;

  return `
    <div class="result-row" onclick="toggleResultDetail('${rowId}', this)">
      <span class="num">${num}</span>
      <span class="desc" title="${escapeAttr(r.description)}">${escapeHtml(r.description)}</span>
      <span class="status-badge">${r.expectedStatus}</span>
      <span class="status-badge ${statusClass}">${r.actualStatus || 'ERR'}</span>
      <span style="color:var(--text2)">${r.elapsed}ms</span>
      <span>${resultBadge}</span>
    </div>
    <div class="result-detail" id="${rowId}">
      <div class="detail-tabs">
        <button class="detail-tab active" onclick="switchDetailTab(this,'${rowId}','request')">Request</button>
        <button class="detail-tab" onclick="switchDetailTab(this,'${rowId}','mutatedbody')">Mutated Body</button>
        <button class="detail-tab" onclick="switchDetailTab(this,'${rowId}','sentpayload')">Sent Payload</button>
        <button class="detail-tab" onclick="switchDetailTab(this,'${rowId}','response')">Response Body</button>
        <button class="detail-tab" onclick="switchDetailTab(this,'${rowId}','resheaders')">Response Headers</button>
        ${r.error ? `<button class="detail-tab" onclick="switchDetailTab(this,'${rowId}','error')">Error</button>` : ''}
      </div>
      <div data-tab="request">
        <div style="margin-bottom:8px;font-size:13px">
          <span class="method-badge ${r.requestMethod || ''}" style="font-size:11px;padding:2px 8px;border-radius:4px;font-weight:700">${escapeHtml(r.requestMethod || '')}</span>
          <span style="font-family:monospace;color:var(--cyan);margin-left:6px">${escapeHtml(r.requestUrl || '')}</span>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">REQUEST HEADERS</div>
        <pre>${escapeHtml(JSON.stringify(r.requestHeaders || {}, null, 2))}</pre>
      </div>
      <div data-tab="mutatedbody" style="display:none">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">MUTATED BODY</div>
        <pre>${escapeHtml(JSON.stringify(r.mutatedBody, null, 2))}</pre>
      </div>
      <div data-tab="sentpayload" style="display:none">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">ACTUAL SENT PAYLOAD</div>
        <pre>${r.sentPayload ? escapeHtml((() => { try { return JSON.stringify(JSON.parse(r.sentPayload), null, 2); } catch { return r.sentPayload; } })()) : escapeHtml(JSON.stringify(r.mutatedBody, null, 2))}</pre>
      </div>
      <div data-tab="response" style="display:none"><pre>${escapeHtml(typeof r.responseBody === 'string' ? r.responseBody : JSON.stringify(r.responseBody, null, 2))}</pre></div>
      <div data-tab="resheaders" style="display:none"><pre>${escapeHtml(JSON.stringify(r.responseHeaders, null, 2))}</pre></div>
      ${r.error ? `<div data-tab="error" style="display:none"><pre style="color:var(--red)">${escapeHtml(r.error)}</pre></div>` : ''}
    </div>`;
}

function toggleResultDetail(id, rowEl) {
  const detail = document.getElementById(id);
  if (!detail) return;
  detail.classList.toggle('show');
  rowEl.classList.toggle('expanded');
}

function switchDetailTab(tabEl, detailId, tabName) {
  const detail = document.getElementById(detailId);
  detail.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
  detail.querySelectorAll('[data-tab]').forEach(c => c.style.display = 'none');
  tabEl.classList.add('active');
  detail.querySelector(`[data-tab="${tabName}"]`).style.display = 'block';
}

// ============ DOWNLOAD REPORT ============
async function downloadReport() {
  if (!lastReport) return toast('No test results to export', 'error');

  try {
    const res = await fetch('/api/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lastReport),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-test-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);

    toast('Report downloaded', 'success');
  } catch (err) {
    toast('Download error: ' + err.message, 'error');
  }
}

// ============ SESSION STORAGE ============
const STORAGE_KEY = 'openApiTester_requests';

function getSessionRequests() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function setSessionRequests(requests) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

// ============ SAVED REQUESTS (session-only) ============
function loadSavedRequests() {
  const requests = getSessionRequests();
  const container = document.getElementById('savedList');
  const keys = Object.keys(requests);

  if (keys.length === 0) {
    container.innerHTML = '<div style="padding:12px;color:var(--text3);font-size:13px">No saved requests</div>';
    return;
  }

  container.innerHTML = keys.map(name => {
    const item = requests[name];
    return `
      <div class="saved-item" onclick="loadSaved('${escapeAttr(name)}')" title="${escapeAttr(item.url || '')}">
        <span class="method-badge ${item.method || 'GET'}">${item.method || '?'}</span>
        <span class="name">${escapeHtml(name)}</span>
        <button class="delete-btn" onclick="event.stopPropagation();deleteSaved('${escapeAttr(name)}')" title="Delete">&times;</button>
      </div>`;
  }).join('');
}

function loadSaved(name) {
  const requests = getSessionRequests();
  const data = requests[name];
  if (!data) return toast('Request not found', 'error');

  // Populate form
  document.getElementById('reqMethod').value = data.method || 'POST';
  document.getElementById('reqUrl').value = data.url || '';

  // Headers
  const headersList = document.getElementById('headersList');
  headersList.innerHTML = '';
  for (const [key, value] of Object.entries(data.headers || {})) {
    addHeaderRow(key, value);
  }
  if (!data.headers || Object.keys(data.headers).length === 0) {
    addHeaderRow('Content-Type', 'application/json');
  }

  // Body
  if (data.body) {
    document.getElementById('reqBody').value =
      typeof data.body === 'object' ? JSON.stringify(data.body, null, 2) : data.body;
  } else {
    document.getElementById('reqBody').value = '';
  }

  // Expectations
  if (data.expectations) {
    for (const [key, val] of Object.entries(data.expectations)) {
      const input = document.getElementById('exp-' + key);
      if (input) input.value = val;
    }
  }

  // Mutation config
  if (data.mutationConfig) {
    for (const [key, val] of Object.entries(data.mutationConfig)) {
      const cb = document.getElementById('mut-' + key);
      if (cb) cb.checked = val;
    }
  }

  validateBody();

  // Highlight in sidebar
  document.querySelectorAll('.saved-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.saved-item').forEach(el => {
    if (el.getAttribute('onclick')?.includes(name)) el.classList.add('active');
  });

  toast(`Loaded "${name}"`, 'success');
  switchMainTab(document.querySelector('[data-tab="request"]'));
}

function showSaveModal() {
  document.getElementById('saveModal').style.display = 'flex';
  document.getElementById('saveName').focus();
}

function closeSaveModal() {
  document.getElementById('saveModal').style.display = 'none';
}

function saveCurrentRequest() {
  const name = document.getElementById('saveName').value.trim();
  if (!name) return toast('Please enter a name', 'error');

  const requests = getSessionRequests();
  requests[name] = {
    url: document.getElementById('reqUrl').value,
    method: document.getElementById('reqMethod').value,
    headers: getHeaders(),
    body: getBody(),
    expectations: getExpectations(),
    mutationConfig: getMutationConfig(),
  };
  setSessionRequests(requests);

  closeSaveModal();
  loadSavedRequests();
  toast(`Saved "${name}"`, 'success');
}

function deleteSaved(name) {
  if (!confirm(`Delete "${name}"?`)) return;
  const requests = getSessionRequests();
  delete requests[name];
  setSessionRequests(requests);
  loadSavedRequests();
  toast('Deleted', 'success');
}

function newRequest() {
  document.getElementById('reqMethod').value = 'POST';
  document.getElementById('reqUrl').value = '';
  document.getElementById('reqBody').value = '';
  document.getElementById('curlInput').value = '';
  document.getElementById('bodyStatus').textContent = '';

  const headersList = document.getElementById('headersList');
  headersList.innerHTML = '';
  addHeaderRow('Content-Type', 'application/json');

  document.querySelectorAll('.saved-item').forEach(el => el.classList.remove('active'));
  switchMainTab(document.querySelector('[data-tab="request"]'));
}

// ============ IMPORT/EXPORT ============
function exportAll() {
  const requests = getSessionRequests();
  const keys = Object.keys(requests);
  if (keys.length === 0) return toast('No saved requests to export', 'error');

  const exportData = keys.map(name => ({ name, ...requests[name] }));
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'api-tester-requests.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Requests exported', 'success');
}

function showImportModal() {
  document.getElementById('importModal').style.display = 'flex';
}

function closeImportModal() {
  document.getElementById('importModal').style.display = 'none';
}

function importData() {
  const raw = document.getElementById('importData').value.trim();
  if (!raw) return toast('Paste JSON data', 'error');

  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const requests = getSessionRequests();

    for (const item of arr) {
      const name = item.name || `Imported ${Date.now()}`;
      requests[name] = {
        url: item.url || item.request?.url || '',
        method: item.method || item.request?.method || 'POST',
        headers: item.headers || item.request?.headers || {},
        body: item.body || item.request?.body || null,
        expectations: item.expectations || {},
        mutationConfig: item.mutationConfig || {},
      };
    }

    setSessionRequests(requests);
    closeImportModal();
    loadSavedRequests();
    toast(`Imported ${arr.length} request(s)`, 'success');
  } catch (err) {
    toast('Import error: ' + err.message, 'error');
  }
}

// ============ UTILITIES ============
function escapeHtml(str) {
  if (str === null || str === undefined) return 'null';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
