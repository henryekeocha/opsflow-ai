# OpsFlow AI

> **AI-powered operations assistant for enterprise teams**

A production-quality, microservice-based web application demonstrating senior-level full-stack engineering, LLM integration with Anthropic Claude, AWS serverless architecture, and infrastructure-as-code with Terraform.

---

## 1. Project Summary

OpsFlow AI is a portfolio-grade application built to showcase the patterns that matter in modern enterprise software:

- **Real-time AI streaming** — Content briefs stream token-by-token via Server-Sent Events (SSE) from a FastAPI backend to a Next.js 14 frontend.
- **Multi-model LLM orchestration** — A side-by-side comparator calls Claude live and simulates GPT-4o and Gemini responses, then asks Claude to recommend the best answer.
- **Serverless microservice** — Lead enrichment runs on an AWS Lambda function invoked through API Gateway, retrieving secrets from AWS Secrets Manager and calling Claude to generate sales intelligence.
- **Enterprise infra patterns** — Complete Terraform provisions every AWS resource. No credentials are hardcoded; all secrets live in Secrets Manager.
- **LLMOps** — An automated eval harness (`eval_brief.py`) runs rubric-based quality checks against the content brief endpoint.

---

## 2. Live Demo

| Service | URL |
|---------|-----|
| Frontend (Vercel) | `https://opsflow-ai.vercel.app` *(deploy to update)* |
| Backend API | `http://localhost:8000` *(Docker)* |
| Lambda endpoint | Terraform output → `api_gateway_url` |

---

## 3. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend hosting | Vercel | Zero-config Next.js deployment, edge CDN, preview deployments per branch, instant rollbacks |
| Backend service | FastAPI on Docker | Async support for streaming, typed with Pydantic, portable container, simple horizontal scaling |
| Serverless function | AWS Lambda + API Gateway | Demonstrates serverless pattern; ideal for bursty, stateless workloads like lead enrichment |
| LLM provider | Anthropic Claude | Best-in-class instruction following, streaming SDK, structured output reliability |
| Infrastructure as Code | Terraform | Provider-agnostic, declarative, production industry standard with state management |
| Secret management | AWS Secrets Manager | No hardcoded credentials; supports automatic rotation and fine-grained IAM access |
| Streaming protocol | SSE via FastAPI `StreamingResponse` | Real-time UX without WebSocket complexity; one-directional, perfect for LLM token streaming |
| UI components | shadcn/ui + Tailwind CSS | Accessible Radix UI primitives + utility-first rapid styling |

---

## 4. Repository Structure

```
opsflow-ai/
├── frontend/          # Next.js 14 app — deploys to Vercel
│   ├── src/
│   │   ├── app/       # App Router pages (/, /brief, /compare, /enrich, /architecture)
│   │   └── components/# Sidebar, shadcn/ui components
│   └── package.json
├── backend/           # FastAPI service — runs in Docker
│   ├── main.py        # /api/brief (SSE), /api/multimodel, /health
│   ├── evals/
│   │   └── eval_brief.py  # Rubric-based prompt eval harness
│   └── Dockerfile
├── lambda/            # AWS Lambda lead enrichment function
│   ├── handler.py     # lambda_handler entry point
│   ├── build.sh       # Packages lambda.zip for Terraform
│   └── events/        # SAM local test events
└── terraform/         # All AWS infrastructure as code
    ├── main.tf        # Lambda, API Gateway, Secrets Manager, IAM, CloudWatch
    ├── variables.tf
    └── outputs.tf
```

---

## 5. Local Development Setup

### Prerequisites

- Node.js 18+, npm
- Python 3.11+
- Docker + Docker Compose
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### Step 1 — Backend (FastAPI)

```bash
cd backend
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
docker-compose up
```

The API is now available at `http://localhost:8000`. Verify with:

```bash
curl http://localhost:8000/health
# {"status":"ok","version":"1.0.0"}
```

### Step 2 — Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
#   NEXT_PUBLIC_LAMBDA_URL=<your-api-gateway-url>
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Step 3 — Lambda (optional local testing with SAM)

```bash
cd lambda
pip install aws-sam-cli
sam local invoke LeadEnrichmentFunction -e events/test_event.json
```

> SAM requires Docker to be running.

---

## 6. Deployment Guide

### 6a — Deploy Lambda + AWS Infrastructure (Terraform)

```bash
# 1. Package the Lambda
cd lambda
./build.sh          # Produces lambda.zip

# 2. Init and apply Terraform
cd ../terraform
terraform init
terraform plan
terraform apply

# 3. Set the secret value (never stored in Terraform state)
aws secretsmanager put-secret-value \
  --secret-id opsflow-ai/anthropic-api-key \
  --secret-string '{"ANTHROPIC_API_KEY": "sk-ant-YOUR-KEY-HERE"}' \
  --region us-east-1

# 4. Grab the API Gateway URL from outputs
terraform output api_gateway_url
```

### 6b — Deploy Backend to Docker/ECS

```bash
cd backend
docker build -t opsflow-backend .
docker run -p 8000:8000 --env-file .env opsflow-backend
```

For production, push to Amazon ECR and create an ECS Fargate service. The `Dockerfile` is production-ready.

### 6c — Deploy Frontend to Vercel

```bash
cd frontend
npx vercel --prod
```

Set these environment variables in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | Your FastAPI service URL |
| `NEXT_PUBLIC_LAMBDA_URL` | Terraform `api_gateway_url` output |

---

## 7. Prompt Engineering Notes

### Content Brief (`/api/brief`)

The system prompt instructs Claude to act as an **editorial strategist for enterprise healthcare media** and return output in five named sections. Section headers allow the frontend to parse the stream into structured card components once generation completes.

Key decisions:
- The audience and content type are injected into the user turn (not the system prompt) so the system prompt stays cacheable, reducing cost on repeated calls.
- `max_tokens: 1500` is sufficient for a complete brief without unnecessary padding.

### Multi-Model Comparison (`/api/multimodel`)

A second Claude call evaluates all three model responses. The system prompt primes Claude as an **AI analyst** rather than a helpful assistant to elicit more critical, evaluative language rather than neutral summaries.

### Lead Enrichment (Lambda)

The system prompt requests a strict JSON structure. Claude is asked to produce exactly `{"company_summary", "outreach_angle", "talking_points"}` — the Lambda handler parses this directly. Markdown code fences are stripped defensively since some Claude versions wrap JSON in ` ```json ` blocks.

---

## 8. Running the Eval Suite

```bash
cd backend
pip install httpx        # Only dependency beyond the backend's requirements

# Start the backend first
docker-compose up -d

# Run evals
python evals/eval_brief.py
# Or with verbose response output:
python evals/eval_brief.py --verbose
```

Example output:

```
=================================================================
  OpsFlow AI — Content Brief Eval Suite
  Endpoint: http://localhost:8000/api/brief
=================================================================

  Running Test 1: "AI in radiology"... PASS (5/5 criteria • 2.1s)
  Running Test 2: "Diabetes management trends"... PASS (5/5 criteria • 1.9s)
  Running Test 3: "Healthcare cybersecurity threats in 2025"... PASS (5/5 criteria • 2.4s)
  Running Test 4: "Personalised medicine and genomics"... PASS (5/5 criteria • 2.0s)
  Running Test 5: "Value-based care reimbursement models"... PASS (5/5 criteria • 1.8s)

=================================================================
  Summary
=================================================================
  Total tests : 5
  Passed      : 5
  Failed      : 0
  Errors      : 0
  Avg latency : 2.0s

  Per-criterion breakdown:
    Has Headline         █████ 5/5
    Has Hook             █████ 5/5
    Has Key Points       █████ 5/5
    Word Count OK        █████ 5/5
    Has CTA              █████ 5/5
=================================================================
```

---

## 9. Future Improvements

- **Real Salesforce OAuth** — Replace the mock CRM lookup with a proper Salesforce Connected App using client credentials flow.
- **Amazon Bedrock** — Add Bedrock as an alternative LLM provider so the multi-model comparator can include Claude on Bedrock vs. Claude on the Anthropic API for latency/cost benchmarking.
- **Redis response caching** — Cache multi-model comparison results by prompt hash to avoid redundant API calls for identical prompts.
- **Webhook streaming** — Replace SSE with a WebSocket for bi-directional control (e.g., letting users interrupt generation mid-stream).
- **CI/CD pipeline** — Add GitHub Actions workflows: `terraform fmt` + `terraform validate` on PRs, Docker image build + push to ECR on merge to main, Vercel preview deployments per branch.
- **Observability** — Integrate Datadog or Grafana Cloud for distributed tracing across the frontend → FastAPI → Claude call chain and Lambda invocations.

---

## 10. Final Checklist

- [x] Frontend builds with `npm run build` — zero TypeScript errors
- [x] Backend starts with `docker-compose up` and `/health` returns 200
- [x] Streaming works end-to-end on the `/brief` page (SSE)
- [x] Lambda is fully packaged with `build.sh` (produces `lambda.zip`)
- [x] All Terraform resources are complete and valid
- [x] Eval script runs and produces a pass/fail report with per-criterion breakdown
- [x] README written as a professional architecture decision document
- [x] No API keys hardcoded — all secrets via environment variables or Secrets Manager
- [x] CORS configured on both FastAPI and API Gateway

---
