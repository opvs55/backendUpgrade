# Interactive Readings + External Share (Phase 1) - Backend Contract

Base path: `/api/v1/readings`  
Public base path: `/api/public/readings`

Reference client files:
- `src/services/api/endpoints.js`
- `src/services/api/interactiveReadingsApi.js`

## 1) Authentication rules

### Private endpoints
- Require `Authorization: Bearer <supabase_access_token>`.
- Requests without valid session must return:
  - `401 UNAUTHORIZED`

### Public endpoint (slug)
- `GET /api/public/readings/:slug`
- No auth required.
- Must return sanitized content only (never expose private payload).

---

## 2) Session states (authoritative)

Canonical session statuses:
- `matching`
- `in_progress`
- `awaiting_close`
- `closed`
- `cancelled`
- `expired`

Suggested transition flow:
1. `matching` -> `in_progress` (match accepted by counterpart)
2. `in_progress` -> `awaiting_close` (one side requests close)
3. `awaiting_close` -> `closed` (both sides confirm close)
4. Any non-final state -> `cancelled` or `expired` (timeout/business rule)

Final states: `closed`, `cancelled`, `expired`

---

## 3) Endpoint contract

## Queue

### POST `/api/v1/readings/queue/join`
Join matchmaking queue for a given `week_ref`.

Request:
```json
{
  "week_ref": "2026-W15",
  "preferences": {}
}
```

Response:
```json
{
  "status": "ok",
  "queue_state": "waiting",
  "week_ref": "2026-W15"
}
```

### POST `/api/v1/readings/queue/leave`
Leave current active queue entry.

Response:
```json
{
  "status": "ok",
  "queue_state": "left"
}
```

### GET `/api/v1/readings/queue/status?week_ref=2026-W15`
Return active queue status for current user/week.

Response:
```json
{
  "status": "ok",
  "queue_state": "waiting",
  "matched_session_id": null
}
```

## Match

### POST `/api/v1/readings/match/accept`
Accept a pending match/session.

Request:
```json
{
  "session_id": "uuid"
}
```

Response:
```json
{
  "status": "ok",
  "session_id": "uuid",
  "session_status": "in_progress"
}
```

## Sessions

### GET `/api/v1/readings/sessions/:id`
Return full private session payload for participants only.

### POST `/api/v1/readings/sessions/:id/messages`
Persist message/event to session timeline.

Request:
```json
{
  "message": "texto do usuário"
}
```

### POST `/api/v1/readings/sessions/:id/draw`
Authoritative card draw endpoint (server decides card and order).

Request:
```json
{
  "count": 1
}
```

Response:
```json
{
  "status": "ok",
  "session_id": "uuid",
  "draws": [
    {
      "draw_index": 1,
      "card_code": "the-fool",
      "card_name": "O Louco",
      "is_reversed": false
    }
  ]
}
```

### POST `/api/v1/readings/sessions/:id/close/request`
Request session close from one participant.

### POST `/api/v1/readings/sessions/:id/close/confirm`
Confirm close request. Session closes only after both confirmations.

Response (after second confirmation):
```json
{
  "status": "ok",
  "session_id": "uuid",
  "session_status": "closed"
}
```

## History

### GET `/api/v1/readings/history?limit=20&offset=0`
List user session history (closed/cancelled/expired and optionally active).

Response:
```json
{
  "status": "ok",
  "items": [
    {
      "session_id": "uuid",
      "week_ref": "2026-W15",
      "session_status": "closed",
      "updated_at": "2026-04-14T19:00:00.000Z"
    }
  ]
}
```

## Shares

### GET `/api/v1/readings/shares/:shareId`
Private owner endpoint for share detail/configuration.

### POST `/api/v1/readings/shares/:shareId`
Update share settings (`is_active`, `expires_at`, `visibility`, `content_level`).

Request:
```json
{
  "is_active": true,
  "expires_at": "2026-04-30T23:59:59.000Z",
  "visibility": "public",
  "content_level": "summary"
}
```

### GET `/api/public/readings/:slug`
Public endpoint by slug with sanitized payload only.

Response:
```json
{
  "status": "ok",
  "slug": "abc12345-demo",
  "visibility": "public",
  "content_level": "summary",
  "session_status": "closed",
  "payload": {}
}
```

---

## 4) Business rules (must-have)

1. **Authoritative draw on backend**
   - Client never decides card outcome.
   - Draw order must be server-controlled and persisted with sequential `draw_index`.

2. **Consensual close**
   - Session moves to `awaiting_close` when one side requests close.
   - Session moves to `closed` only when both participants confirm.

3. **Share controls**
   - Share visibility and payload controlled by:
     - `is_active`
     - `expires_at`
     - `visibility` (`private|unlisted|public`)
     - `content_level` (`summary|standard|full`)

4. **Public safety**
   - Public slug endpoint must return only sanitized payload (`content_level` applied).
   - No internal/private session fields should be exposed in public responses.

---

## 5) Standard errors

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Descrição clara para UI",
  "details": {}
}
```

Recommended codes for this feature:
- `UNAUTHORIZED` (401)
- `VALIDATION_ERROR` (422)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `SERVICE_UNAVAILABLE` (503)
