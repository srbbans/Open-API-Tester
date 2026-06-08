# ECAF Photo Capture with On-Device Object Detection

**Feature:** Smart Photo Capture & Fatality Scoring for ECAF Tickets
**Screen:** Fill ECAF (Ticket Screen)
**Version:** 1.0 · Draft
**Open Items:** 2 (see Section 6)

---

## 1. Overview

Field technicians capture and upload installation photos directly from the ECAF ticket screen. Each photo type is validated on-device using an object detection model before upload. Validated images are sent to the server for fatality/quality scoring. The submit flow avoids redundant base64 transfers.

---

## 2. Object Types

| # | Label | Object Detected |
|---|-------|-----------------|
| 1 | Connectorisation @ LNBF | LNBF connector |
| 2 | Connectorisation @ STB | STB connector |
| 3 | Drip Loop | Drip loop cable |
| 4 | ODU | Outdoor unit (dish) |
| 5 | P-Clip | P-Clip fastener |
| 6 | STB Info Sheet | STB info label / sheet |
| 7 | TP Info | TP info label |

---

## 3. Feature Flow

```
Ticket Screen Load
      │
      ▼
[API] GET — Fetch upload status per object type
      │
      ▼
Render photo list — enable / disable "Capture Photo" per type
      │
      ▼
Technician taps "Capture Photo" on an object type
      │
      ▼
Launch native camera (rear only, with mask overlay)
      │
      ▼
Technician takes photo
      │
      ▼
On-device model runs object detection
      │
      ├─ Not detected ──► Preview Dialog
      │                       • Upload   [DISABLED]
      │                       • Re-capture [ENABLED]
      │
      └─ Detected ──────► Preview Dialog
                              • Upload   [ENABLED]
                              • Re-capture [ENABLED]
                                      │
                                      ▼
                            Technician taps "Upload"
                                      │
                                      ▼
                       Derive 2 images from original:
                       • Image 1 — Full / actual photo
                       • Image 2 — Cropped object region
                                      │
                                      ▼
                       [API] POST — Send both images to server
                              (Object Detection + Scoring API)
                                      │
                                      ▼
                            Fatality score returned
                            ⚠️ OPEN: when to show score? (see §6)
                                      │
                                      ▼
                       Object type marked as uploaded on ticket screen
                                      │
                                      ▼
                       All types complete → Technician taps Submit
                                      │
                                      ▼
                       [API] POST — Submit ticket (existing endpoint)
                              No base64 images in payload
```

---

## 4. Detailed Requirements

### 4.1 Ticket Screen — Initial Load

- **API:** GET upload status for all object types for the current ticket.
- **Response:** Per-object boolean / status indicating upload state.
- **UI:**
  - Uploaded → "Capture Photo" button **disabled** *(confirm re-upload policy with product)*
  - Not uploaded → "Capture Photo" button **enabled**

### 4.2 Camera Launch

- **Camera:** Rear camera only; no front camera.
- **Overlay:** Masking shown on camera preview to guide framing.
- **Mode:** Standard photo capture; no special configuration required.

### 4.3 On-Device Object Detection

- Runs immediately after photo capture.
- Model attempts to detect the object corresponding to the selected type (e.g. LNBF for "Connectorisation @ LNBF").
- Detection result (detected / not detected) determines the state of the Upload button in the Preview Dialog.
- **Model loading:** Pre-load / cache on app launch or ticket screen open to avoid capture-time latency.
- **Failure handling:** If model crashes or OOM → treat as "not detected", keep Upload disabled, log error.

### 4.4 Preview Dialog

Displayed after every capture, regardless of detection result.

| Element | Behaviour |
|---------|-----------|
| Image preview | Full captured image shown |
| Detection indicator | Bounding box overlay or "✓ [Object] detected" / "✗ not detected" |
| Upload button | Enabled only if object detected |
| Re-capture button | Always enabled — dismisses dialog, re-launches camera |

### 4.5 Upload API

- **Trigger:** User taps "Upload" in preview dialog.
- **Image preparation:**
  - **Image 1 (Full):** Original full-resolution photo.
  - **Image 2 (Cropped):** Object region cropped using detection model bounding box.
- **Request:** Multipart POST — ticket ID, object type identifier, both images.
- **On success:** Mark object type as uploaded; update button state on ticket screen.
- **On failure:** Show error with retry option. Do not mark as uploaded. Do not discard captured image.

### 4.6 Submit — Existing API

- Use existing ticket submit endpoint as-is.
- **Change:** Remove base64 image data from submit payload — images already sent via scoring API (§4.5).
- **Action required:** Confirm with backend that submit endpoint no longer expects image data.

---

## 5. Non-Functional Requirements

| Concern | Requirement |
|---------|-------------|
| On-device model size | < 50 MB (quantised if necessary) |
| Offline support | Capture + detection work offline; Upload requires connectivity |
| Image quality | High resolution recommended for accurate server scoring |
| Camera permission | Request before launch; handle denial gracefully |
| Upload failure | Show retry; preserve captured image in memory |
| OTA model update | Detection model must be updatable without a full app release |

---

## 6. Open Items

> ⚠️ **Item 1 — HIGH · Blocks UI design**
>
> **When is the fatality score shown to the technician?**
> Options:
> - (a) Immediately after each photo upload
> - (b) On final submit
> - (c) Only if score crosses a threshold requiring action
>
> This determines whether the technician must take corrective action before submitting.
> **Owner:** Product

---

> ⚠️ **Item 2 — MEDIUM**
>
> **Can an already-uploaded photo be re-captured from the ticket screen?**
> If yes — does re-upload overwrite the previous fatality score on the server?
> **Owner:** Product / Backend

---

## 7. API Summary

| API | Method | Trigger | Notes |
|-----|--------|---------|-------|
| Upload status | GET | Ticket screen load | Returns per-object-type upload status |
| Image scoring | POST | User taps Upload | Sends full + cropped image; returns fatality score |
| Submit ticket | POST | User taps Submit | Existing API — remove base64 image payload |

*See `ECAF_API_Spec.md` for full request / response contracts.*

---

## 8. Edge Cases

1. **All photos already uploaded** — all "Capture Photo" buttons disabled; Submit enabled.
2. **Partial uploads** — confirm whether all 7 types are mandatory before Submit is allowed.
3. **OTA model updates** — detection model must be updatable without a full app release.
4. **Dark / blurry images** — model returns "not detected"; user must re-capture. Consider a capture quality hint in the camera UI.
5. **Wrong object type** — photographing an ODU for an LNBF slot will fail detection. This is the intended guard.

---

# ECAF Installation Images — API Specification

**Version:** 1.0 · Draft
**Prepared for:** API / Backend Team
**Related doc:** `ECAF_Feature_Doc.md`

---
---

## API 1 — Get Installation Images Status

Fetches the upload and scoring status for each required photo type for a given ticket. Called on ticket screen load to enable / disable the "Capture Photo" button per object type.

### Request

```
GET /getInstallationImagesStatus
```

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticket_id` | string | ✅ | Unique ticket identifier |
| `technicianId` | string | ✅ | ID of the logged-in technician |
| `deviceId` | string | ✅ | Unique identifier of the technician's device |
| `source` | string | ✅ | Client source identifier (e.g. `ANDROID`, `IOS`) |

---

### Response

```json
{
  "ticket_id": "1023350806",
  "photos": [
    {
      "object_type": "LNBF",
      "label": "Connectorisation @ LNBF",
      "uploaded": true,
      "uploaded_at": "2026-06-03T10:22:14Z",
      "score": 87.4
    },
    {
      "object_type": "STB",
      "label": "Connectorisation @ STB",
      "uploaded": false,
      "uploaded_at": null,
      "score": null
    },
    {
      "object_type": "DRIP_LOOP",
      "label": "Drip Loop",
      "uploaded": false,
      "uploaded_at": null,
      "score": null
    },
    {
      "object_type": "ODU",
      "label": "ODU",
      "uploaded": false,
      "uploaded_at": null,
      "score": null
    },
    {
      "object_type": "P_CLIP",
      "label": "P-Clip",
      "uploaded": false,
      "uploaded_at": null,
      "score": null
    },
    {
      "object_type": "STB_INFO_SHEET",
      "label": "STB Info Sheet",
      "uploaded": false,
      "uploaded_at": null,
      "score": null
    },
    {
      "object_type": "TP_INFO",
      "label": "TP Info",
      "uploaded": false,
      "uploaded_at": null,
      "score": null
    }
  ]
}
```

**`object_type` enum values**

| Value | UI Label |
|-------|----------|
| `LNBF` | Connectorisation @ LNBF |
| `STB` | Connectorisation @ STB |
| `DRIP_LOOP` | Drip Loop |
| `ODU` | ODU |
| `P_CLIP` | P-Clip |
| `STB_INFO_SHEET` | STB Info Sheet |
| `TP_INFO` | TP Info |


---
---

## API 2 — Check Fatality Score

Called when the technician taps "Upload" after a successful on-device object detection. Sends two derived images (full + cropped) as multipart form data along with ticket metadata. The server scores the images and returns a fatality level.

### Request

```
POST /checkFatalityScore
```

**Headers**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ticket_id` | string | ✅ | Unique ticket identifier |
| `technicianId` | string | ✅ | ID of the logged-in technician |
| `deviceId` | string | ✅ | Unique identifier of the technician's device |
| `source` | string | ✅ | Client source identifier (e.g. `ANDROID`, `IOS`) |
| `object_type` | string (enum) | ✅ | Object type being uploaded (e.g. `LNBF`) |
| `full_image` | file (JPEG / PNG) | ✅ | Full-resolution original photo from camera |
| `cropped_image` | file (JPEG / PNG) | ✅ | Object region cropped using on-device detection bounding box |
| `detection_confidence` | float | ✅ | On-device model confidence score (0.0 – 1.0) |
| `captured_at` | string (ISO 8601) | ✅ | Timestamp of when the photo was taken on-device |

---

### Response

**200 OK**

```json
{
  "ticket_id": "1023350806",
  "object_type": "LNBF",
  "upload_id": "upl_9f3a2c8e1b",
  "status": "scored",
  "fatality_score": 87.4,
  "fatality_level": "PASS",
  "scored_at": "2026-06-03T10:45:04Z",
  "images": {
    "full_image_url": "https://storage.example.com/ecaf/1023350806/LNBF/full.jpg",
    "cropped_image_url": "https://storage.example.com/ecaf/1023350806/LNBF/cropped.jpg"
  }
}
```


---
---

## API 3 — Submit ECAF (Existing — Modified)

```
POST /API/AppTechnician/UploadEcafAllDocPhase2
```

> **Existing API — one change only.**
>
> ❌ **Remove/optional** base64 image data from the request payload.
> Images are already uploaded to the server via **API 2** (`/checkFatalityScore`).
> The server should reference uploaded images by `ticket_id` + `object_type` — no image data expected here.

All other existing request fields and response structure remain unchanged. Coordinate with the backend team to confirm the endpoint no longer reads or validates any image fields from this payload.

---
---



*Based on feature brief and ECAF ticket screen — Ticket No. 1023350806.*
