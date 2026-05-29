# Camora — Image Repositories

All Docker images are published to **GitHub Container Registry (GHCR)**.

## Repositories

| Service | Image | Port | Source |
|---------|-------|------|--------|
| Lumora Backend | `ghcr.io/schundu007/camora/lumora-backend` | 8000 | `apps/lumora-backend/` |
| Ascend Backend | `ghcr.io/schundu007/camora/ascend-backend` | 3009 | `apps/ascend-backend/` |
| AI Services | `ghcr.io/schundu007/camora/ai-services` | 8001 | `apps/ai-services/` |

## Tag Strategy

| Tag | Description | Trigger |
|-----|-------------|--------|
| `latest` | Current main branch | Every push to `main` |
| `main` | Main branch alias | Every push to `main` |
| `sha-<7chars>` | Exact commit SHA | Every build |
| `v1.2.3` | Semantic version | Git tag `v*` |
| `v1.2` | Minor version alias | Git tag `v*` |

## Pulling Images

```bash
# Authenticate
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull latest
docker pull ghcr.io/schundu007/camora/lumora-backend:latest
docker pull ghcr.io/schundu007/camora/ascend-backend:latest
docker pull ghcr.io/schundu007/camora/ai-services:latest

# Pull specific commit
docker pull ghcr.io/schundu007/camora/lumora-backend:sha-abc1234
```

## Running Locally

```bash
# lumora-backend
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e OPENAI_API_KEY="sk-..." \
  -e AI_SERVICES_URL="http://localhost:8001" \
  ghcr.io/schundu007/camora/lumora-backend:latest

# ascend-backend
docker run -p 3009:3009 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET_KEY="..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e STRIPE_SECRET_KEY="sk_live_..." \
  ghcr.io/schundu007/camora/ascend-backend:latest

# ai-services
docker run -p 8001:8001 \
  -e AI_SERVICES_API_KEY="your-shared-secret" \
  ghcr.io/schundu007/camora/ai-services:latest
```

## CI/CD Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| **CI** | `ci.yml` | PR + push to main/develop — path-filtered per service |
| **Docker Build & Push** | `docker-build-push.yml` | Push to main (backend paths) + manual dispatch |
| **Deploy Frontend** | `deploy-frontend.yml` | Push to main (`apps/camora/**`) + manual |
| **Deploy Railway** | `deploy-railway.yml` | After Docker build succeeds + manual |
| **Security Scan** | `security.yml` | Weekly Monday 02:00 UTC + dependency file changes |
| **Build Desktop** | `build-desktop.yml` | Tag `desktop-v*` + manual |
| **Build Mobile** | `build-mobile.yml` | Tag `mobile-v*` + manual |

## Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

### Docker (auto-provided)
| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Auto-provided — used for GHCR push |

### Frontend Deploy (Vercel)
| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | Vercel organisation ID |
| `VERCEL_PROJECT_ID` | Vercel project ID for `apps/camora` |
| `VITE_LUMORA_API_URL` | e.g. `https://lumora.up.railway.app` |
| `VITE_CAPRA_API_URL` | e.g. `https://ascend.up.railway.app` |
| `VITE_OAUTH_URL` | Google OAuth URL |
| `VITE_ASCEND_URL` | Ascend base URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Backend Deploy (Railway)
| Secret | Description |
|--------|-------------|
| `RAILWAY_DEPLOY_HOOK_LUMORA` | Railway webhook URL for lumora-backend |
| `RAILWAY_DEPLOY_HOOK_ASCEND` | Railway webhook URL for ascend-backend |
| `RAILWAY_DEPLOY_HOOK_AI_SERVICES` | Railway webhook URL for ai-services |
| `LUMORA_API_URL` | e.g. `https://lumora.up.railway.app` |
| `ASCEND_API_URL` | e.g. `https://ascend.up.railway.app` |
| `AI_SERVICES_URL` | e.g. `https://ai-services.up.railway.app` |

### Mobile (EAS)
| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo/EAS personal access token |

### Security (optional)
| Secret | Description |
|--------|-------------|
| `GITLEAKS_LICENSE` | Gitleaks licence key (optional for public repos) |

## Getting Railway Deploy Hooks

1. Open Railway dashboard → your service
2. **Settings → Deploy → Deploy Hook**
3. Click **Generate** → copy the URL
4. Add as `RAILWAY_DEPLOY_HOOK_<SERVICE>` in GitHub secrets

Repeat for each of the three backend services.

## Image Visibility

By default GHCR packages are private. To make them public:
1. Go to `https://github.com/schundu007?tab=packages`
2. Open the package → **Package settings → Change visibility → Public**

Or use the `GITHUB_TOKEN` from Railway with `read:packages` scope for private pulls.
