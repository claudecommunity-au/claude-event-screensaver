# Claude Event Screensaver — REST API

A small HTTP API for creating, updating, and retrieving screensaver configs.
All endpoints return JSON. Content type for request bodies must be
`application/json`.

**Base URL:** `https://claude-event-screensaver.claudecommunityau.workers.dev`

## Authentication

There are no user accounts. Each config has its own admin password, set at
creation time. Reads *through the API* and all writes require that password,
passed in one of two headers (pick either):

- `X-Config-Password: <password>`
- `Authorization: Bearer <password>`

> Note: the web UI at `/{id}` renders the screensaver publicly — no password
> needed. The API's `GET` endpoint is stricter on purpose: it returns the
> structured config so agents can round-trip it through `PUT`.

## The Config object

All endpoints use the same config shape:

```jsonc
{
  "subtitle": "CODE CURIOUS",
  "event_date": "2026-03-11",            // ISO YYYY-MM-DD, or "" for none
  "venue": "Granola",
  "wifi": "Granola-Guest / password",
  "agenda": [
    { "time": "18:00", "label": "Doors" },
    { "time": "18:25", "label": "Anthropic interview" },
    { "time": "23:59", "label": "Time to go home!" }
  ],
  "verbs": [
    "Compiling thoughts...",
    "Reticulating splines..."
  ],
  "go_home_messages": [
    "Time to go home!",
    "git commit -m 'gone home'"
  ],
  "urgency_start_minutes_before_end": 40,  // when the urgency ramp kicks in
  "max_crabs": 5                           // 0-50 scuttling Clawds
}
```

### Field rules

| field | type | rules |
| --- | --- | --- |
| `subtitle` | string | free text, shown below the CLAUDE title |
| `event_date` | string | `YYYY-MM-DD` or empty string |
| `venue` | string | free text |
| `wifi` | string | free text (network / password, however you like) |
| `agenda[].time` | string | `HH:MM` 24-hour |
| `agenda[].label` | string | non-empty |
| `verbs[]` | string[] | each non-empty; shown as rotating "thinking" line |
| `go_home_messages[]` | string[] | each non-empty; shown during the final urgency phase |
| `urgency_start_minutes_before_end` | int | 0–240 |
| `max_crabs` | int | 0–50 |

Unknown fields are rejected. Missing fields fail validation (except `max_crabs`,
which defaults to `5` if omitted).

## Endpoints

### `POST /api/configs` — create a new config

Mints a fresh 6-character ID and stores the config. The supplied password
becomes the admin password for this config; it is hashed (PBKDF2-SHA256) and
never returned.

**Request**

```http
POST /api/configs
Content-Type: application/json

{
  "config": { ...ConfigObject... },
  "password": "at-least-4-chars"
}
```

**Response — `201 Created`**

```json
{
  "id": "A7K3QZ",
  "url": "https://claude-event-screensaver.claudecommunityau.workers.dev/A7K3QZ"
}
```

**Errors**

- `400` — invalid JSON or validation failed (response includes `details` from zod)

### `GET /api/configs/{id}` — read a config (password-gated)

Returns the stored config for the given ID if the password matches.

**Request**

```http
GET /api/configs/A7K3QZ
X-Config-Password: your-password
```

**Response — `200 OK`**

```jsonc
{
  "id": "A7K3QZ",
  "subtitle": "CODE CURIOUS",
  "event_date": "2026-03-11",
  "venue": "Granola",
  "wifi": "...",
  "agenda": [ ... ],
  "verbs": [ ... ],
  "go_home_messages": [ ... ],
  "urgency_start_minutes_before_end": 40,
  "max_crabs": 5,
  "createdAt": "2026-04-17T10:00:00.000Z",
  "updatedAt": "2026-04-17T10:00:00.000Z"
}
```

**Errors**

- `401` — missing `X-Config-Password` / `Authorization: Bearer …` header
- `404` — no config with that ID, **or** password was wrong (the two are not
  distinguished, to limit probing)

### `PUT /api/configs/{id}` — update a config

Replaces the config fields for the given ID. `createdAt` is preserved,
`updatedAt` is bumped. Optionally rotates the admin password.

**Request**

```http
PUT /api/configs/A7K3QZ
Content-Type: application/json
X-Config-Password: your-password

{
  "config": { ...ConfigObject... },
  "newPassword": "optional-new-password"   // omit to keep the old one
}
```

**Response — `200 OK`**

```json
{
  "id": "A7K3QZ",
  "url": "https://claude-event-screensaver.claudecommunityau.workers.dev/A7K3QZ"
}
```

**Errors**

- `400` — invalid JSON or validation failed
- `401` — missing password header or password is wrong
- `404` — no config with that ID

## Walkthrough: creating a screensaver from scratch

```bash
# 1. Create
curl -s -X POST \
  "https://claude-event-screensaver.claudecommunityau.workers.dev/api/configs" \
  -H "content-type: application/json" \
  -d '{
    "config": {
      "subtitle": "CODE CURIOUS",
      "event_date": "2026-05-14",
      "venue": "Granola HQ",
      "wifi": "Granola-Guest / hello123",
      "agenda": [
        {"time":"18:00","label":"Doors"},
        {"time":"18:30","label":"Lightning talks"},
        {"time":"21:30","label":"Time to go home!"}
      ],
      "verbs": ["Compiling thoughts...","Reticulating splines..."],
      "go_home_messages": ["Time to go home!"],
      "urgency_start_minutes_before_end": 40,
      "max_crabs": 6
    },
    "password": "correcthorse"
  }'
# -> { "id": "A7K3QZ", "url": ".../A7K3QZ" }

# 2. Read back
curl -s "https://.../api/configs/A7K3QZ" \
  -H "X-Config-Password: correcthorse"

# 3. Update (e.g. push the end time back)
curl -s -X PUT "https://.../api/configs/A7K3QZ" \
  -H "content-type: application/json" \
  -H "X-Config-Password: correcthorse" \
  -d '{ "config": { ...updated ConfigObject... } }'
```

## Viewing the screensaver

Once created, open `https://.../{id}` in any browser and press `f` for
fullscreen. No password needed for the view.
