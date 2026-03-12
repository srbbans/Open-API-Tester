# Request / Mutation / Test Flow

## How It Works
```
User body (JSON) → generate mutations → send each mutation as HTTP request → collect responses → compare status codes → generate report
```

## Mutation Strategies
| Strategy | Description |
|----------|-------------|
| Field Removed | Remove one field at a time |
| Null Values | Set each field to null |
| Empty Values | Set fields to empty string/array/object |
| Wrong Types | Change field value types |
| Extra Fields | Add unknown fields |
| Array Mutations | Modify array fields |
| Edge Cases | Boundary values, SQL injection, XSS payloads |

## Test Result Tabs (per test case)
| Tab | Content |
|-----|---------|
| Request | Method, URL, request headers |
| Mutated Body | The mutation applied on the JSON body |
| Sent Payload | Actual serialized payload sent over the wire |
| Response Body | Raw response as received |
| Response Headers | Response headers |
| Error | Error message (if any) |

## UI Features
- **cURL Import**: Paste a cURL command to auto-fill URL, method, headers, body
- **Mutation Preview**: Shows all generated mutations grouped by category
- **Save/Load/Import/Export**: JSON file storage in saved/ directory
- **Standalone HTML Report**: Single-file report with embedded CSS/JS for sharing
- **Configurable Expected Status Codes**: Per mutation category
- **Concurrency Control**: Parallel request execution with configurable limit
