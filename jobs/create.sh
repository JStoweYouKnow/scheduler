#!/usr/bin/env bash
# Nebius Serverless Jobs — same Postgres as Vercel.
# Inbox (5 min) and consolidation (nightly) should run here.
# Vercel crons in vercel.json remain the fallback.
set -euo pipefail

IMAGE="${IMAGE:?Set IMAGE to your pushed container}"

nebius ai job create \
  --name scheduler-inbox \
  --image "$IMAGE" \
  --container-command npx \
  --args "tsx jobs/inbox.ts" \
  --env "DATABASE_URL=${DATABASE_URL:?}" \
  --env "NEBIUS_API_KEY=${NEBIUS_API_KEY:?}" \
  --env "MODEL_REASONING=${MODEL_REASONING:-nvidia/nemotron-3-super-120b-a12b}" \
  --env "MODEL_FAST=${MODEL_FAST:-nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B}" \
  --timeout 1h

nebius ai job create \
  --name scheduler-consolidate \
  --image "$IMAGE" \
  --container-command npx \
  --args "tsx jobs/consolidate.ts" \
  --env "DATABASE_URL=${DATABASE_URL:?}" \
  --env "NEBIUS_API_KEY=${NEBIUS_API_KEY:?}" \
  --env "MODEL_REASONING=${MODEL_REASONING:-nvidia/nemotron-3-super-120b-a12b}" \
  --timeout 1h
