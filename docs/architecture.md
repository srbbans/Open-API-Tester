# Architecture & File Structure

```
APIS_unitTester/
├── server.js                          # Express server with REST API endpoints
├── package.json                       # Only dep: express
│
├── public/
│   ├── index.html                     # Main SPA UI
│   ├── app.js                         # Frontend logic (tabs, forms, results, preview)
│   └── style.css                      # Dark theme UI
│
├── src/
│   ├── parser/curlParser.js           # cURL command → {url, method, headers, body}
│   │
│   ├── mutator/
│   │   ├── index.js                   # Orchestrator + walkFields + cloneAndSet/Delete
│   │   ├── fieldRemover.js            # Remove fields one by one
│   │   ├── nullSetter.js              # Set fields to null
│   │   ├── emptySetter.js             # Set fields to empty
│   │   ├── typeSwitcher.js            # Wrong type values
│   │   ├── extraFields.js             # Add unknown fields
│   │   ├── arraySwitcher.js           # Array mutations
│   │   └── edgeCases.js              # Boundary values, SQL injection, XSS
│   │
│   ├── runner/
│   │   ├── httpClient.js              # HTTP client wrapper
│   │   └── testRunner.js              # Concurrent test execution
│   │
│   ├── config/expectations.js         # Default expected status codes per mutation
│   ├── storage/requestStore.js        # Save/load/import/export requests (JSON files in saved/)
│   └── report/reportGenerator.js      # Standalone HTML report builder
│
├── saved/                             # Saved request configs (*.json)
├── reports/                           # Generated HTML reports
└── docs/                              # Documentation
```

## Server API Endpoints
- `POST /api/parse-curl` — Parse cURL string
- `POST /api/preview-mutations` — Preview mutation list
- `POST /api/run-tests` — Run all mutation tests
- `GET /api/progress/:runId` — Test run progress
- `POST /api/report/generate` — Download HTML report
- `GET /api/requests` — List saved requests
- `POST /api/requests/save` — Save a request
- `GET /api/requests/:name` — Load saved request
- `DELETE /api/requests/:name` — Delete saved request
- `POST /api/requests/import` — Import requests JSON array
- `GET /api/requests-export` — Export all requests
