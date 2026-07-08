# Playground V2 — Boot Progress + VS Code IDE + Session Persistence
**Date:** 2026-06-18  
**Status:** Approved — implementing now

---

## What's changing

| Feature | Decision |
|---|---|
| Boot progress | SSE stream from `docker logs -f`; startup scripts emit `__PROGRESS__:` JSON lines |
| VS Code IDE | `code-server` on port 8080 in every Docker image; HTTP+WS proxied through ascend-backend |
| K8s Explorer | VS Code Kubernetes extension pre-installed in k8s images (free with code-server) |
| Session persistence | `localStorage['camora_pg_session']` stores `sessionId`; restored on mount |
| Logout nav | `destroySession()` then `navigate('/capra/playground')` |
| Session cleanup | Background job every 5 min: stop containers for expired DB sessions |
| Token freshness | WS URL token read from `getStoredToken()` at connect time, not baked at session creation |

---

## Boot progress steps (ubuntu/docker/agent-sandbox)

```
SYSTEM CHECKS
  container_ready   — Container started
  env_setup         — Environment configured

TOOLS
  ide_start         — IDE ready
  terminal_ready    — Terminal ready
```

Total: 4 steps. Frontend shows warm-up spinner until first event, then checklist.

---

## New ports per container

| Port | Service |
|---|---|
| 7681 | ttyd (terminal) |
| 8080 | code-server (VS Code IDE) |

Docker run command: `docker run -d --rm ... -p 0:7681 -p 0:8080 <image>`

---

## API shape

**GET /api/v1/playground/sessions/:id/events** — NEW SSE endpoint
SSE events: `data: {"step":"container_ready","label":"Container started","status":"done","phase":"SYSTEM CHECKS","progress":1,"total":4}\n\n`
Final event: `data: {"type":"ready"}\n\n`

**HTTP /playground/ide/:sessionId/** — NEW code-server HTTP proxy
Auth: `cariara_sso` cookie OR `?token=` query param + sets `pg_<sessionId>` cookie

**WS /playground/ide/:sessionId/** — NEW code-server WS proxy
TCP-piped to worker:codeServerPort

---

## Frontend state machine

idle → creating → booting (SSE events) → ready
Page refresh: check localStorage → GET /sessions/:id → if active → skip to ready

## UI tabs (ready state)
[IDE] [Terminal]   (K8s: [IDE] [Explorer] [Terminal])
