# AIOps Diagrams — Design Spec

**Date:** 2026-05-21  
**Files:**
- Modify: `apps/camora/scripts/gen-devops-diagrams.py` — add 6 diagram functions + wire into `__main__`
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` — add `image:` to first viz block of each of the 6 new topics
- Run: `python3 apps/camora/scripts/gen-devops-diagrams.py` — generates z5–z10 PNGs into `public/diagrams/devops/`

## Diagrams

| Function | Output file | Topic ID | Title |
|---|---|---|---|
| `diag_llm_sre_agents()` | `z5-llm-sre-agents.png` | `llm-sre-agents` | LLM SRE Agent — hypothesis loop |
| `diag_capacity_forecasting()` | `z6-capacity-forecasting.png` | `capacity-forecasting-ml` | Capacity forecasting pipeline |
| `diag_aiops_open_source()` | `z7-aiops-open-source.png` | `aiops-open-source-diy` | Open-source AIOps stack |
| `diag_chaos_observability()` | `z8-chaos-observability.png` | `chaos-engineering-observability` | Chaos experiment loop |
| `diag_k8s_aiops()` | `z9-k8s-aiops.png` | `kubernetes-native-aiops` | Kubernetes AIOps stack |
| `diag_aiops_maturity()` | `z10-aiops-maturity.png` | `aiops-roi-maturity` | AIOps maturity model |

## Style (same as z1–z4)
- `base_graph()` with `rankdir='LR'`, `dpi='200'`, same font/color palette
- Colors: navy, gold, green, red, purple, teal, cyan, gray
- 5–7 nodes per diagram, short labels, `n()` + `e()` helpers

## Topic data change
Each of the 6 topics needs `image: '/diagrams/devops/zN-filename.png'` added to its **first** visualization block (index 0 in the `visualizations` array).

## Success criteria
- 6 PNG files exist in `apps/camora/public/diagrams/devops/` (z5–z10)
- 6 `image:` fields added to devopsTopics.js
- `npx vite build` passes
- Committed and pushed
