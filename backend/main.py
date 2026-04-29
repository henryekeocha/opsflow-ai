"""
OpsFlow AI — FastAPI Backend Service
Provides AI-powered endpoints for content briefs, multi-model comparison,
and a live stats endpoint consumed by the dashboard.
"""

import os
import time
import random
from collections import deque
from datetime import datetime, timezone
from typing import AsyncIterator

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="OpsFlow AI Backend",
    description="AI-powered operations backend using Anthropic Claude.",
    version="1.0.0",
)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-20250514"

# ---------------------------------------------------------------------------
# In-memory metrics store
# ---------------------------------------------------------------------------

START_TIME = time.time()

# Rolling window of the last 50 requests: {action, subject, latency_ms, ts}
_activity_log: deque = deque(maxlen=50)

# Per-endpoint totals
_stats = {
    "brief":      {"count": 0, "total_latency_ms": 0},
    "multimodel": {"count": 0, "total_latency_ms": 0},
    "enrich":     {"count": 0, "total_latency_ms": 0},
}


def _record(endpoint: str, subject: str, latency_ms: int):
    """Log a completed request into the in-memory store."""
    _stats[endpoint]["count"] += 1
    _stats[endpoint]["total_latency_ms"] += latency_ms
    _activity_log.appendleft({
        "action": {
            "brief":      "Content brief generated",
            "multimodel": "Model comparison run",
            "enrich":     "Lead enriched",
        }[endpoint],
        "subject": subject,
        "latency_ms": latency_ms,
        "ts": datetime.now(timezone.utc).isoformat(),
    })


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class BriefRequest(BaseModel):
    topic: str
    audience: str
    content_type: str  # "article" | "newsletter" | "social"


class MultiModelRequest(BaseModel):
    prompt: str


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# GET /api/stats  — live dashboard data
# ---------------------------------------------------------------------------

@app.get("/api/stats")
async def get_stats():
    total_requests = sum(v["count"] for v in _stats.values())
    all_latencies = [
        v["total_latency_ms"] / v["count"]
        for v in _stats.values()
        if v["count"] > 0
    ]
    avg_latency_ms = round(sum(all_latencies) / len(all_latencies)) if all_latencies else 0
    uptime_seconds = int(time.time() - START_TIME)

    return {
        "total_requests": total_requests,
        "avg_latency_ms": avg_latency_ms,
        "uptime_seconds": uptime_seconds,
        "endpoints": {
            k: {
                "count": v["count"],
                "avg_latency_ms": round(v["total_latency_ms"] / v["count"]) if v["count"] else 0,
            }
            for k, v in _stats.items()
        },
        "recent_activity": list(_activity_log)[:10],
        "model": MODEL,
        "api_key_configured": bool(ANTHROPIC_API_KEY),
    }


# ---------------------------------------------------------------------------
# POST /api/brief — Streaming Claude response
# ---------------------------------------------------------------------------

BRIEF_SYSTEM_PROMPT = """You are an expert editorial strategist for enterprise healthcare media.
Generate a structured content brief with the following sections:
1. Headline (3 options)
2. Hook (2 sentences)
3. Key Points (5 bullets)
4. Target Audience Insight
5. Call to Action
Format your response clearly with section headers."""


async def stream_brief(topic: str, audience: str, content_type: str) -> AsyncIterator[bytes]:
    """Stream Claude tokens as raw bytes for SSE consumption."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    user_prompt = (
        f"Create a {content_type} content brief on the topic: '{topic}'. "
        f"The target audience is: {audience}."
    )

    t0 = time.time()
    with client.messages.stream(
        model=MODEL,
        max_tokens=1500,
        system=BRIEF_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    ) as stream:
        for text_chunk in stream.text_stream:
            yield text_chunk.encode("utf-8")

    latency_ms = int((time.time() - t0) * 1000)
    _record("brief", topic, latency_ms)


@app.post("/api/brief")
async def create_brief(request: BriefRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    return StreamingResponse(
        stream_brief(request.topic, request.audience, request.content_type),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# POST /api/multimodel — Claude (live) + GPT-4o & Gemini (mocked)
# ---------------------------------------------------------------------------

CLAUDE_INPUT_PRICE_PER_1K  = 0.003
CLAUDE_OUTPUT_PRICE_PER_1K = 0.015

GPT4O_MOCK_RESPONSES = [
    "GPT-4o would provide a comprehensive, well-structured response here, drawing on its training "
    "data and RLHF fine-tuning. OpenAI's model excels at instruction-following tasks and typically "
    "delivers concise, actionable answers. [Simulated response — no OpenAI API key required]",
    "As a large multimodal model, GPT-4o balances breadth and depth in its responses. "
    "It tends to organize information clearly with practical recommendations. "
    "[Simulated response — illustrating multi-provider pattern]",
]

GEMINI_MOCK_RESPONSES = [
    "Gemini Pro brings Google's search-grounded knowledge to this query, offering real-time "
    "web integration capabilities. The model typically structures responses with clear sections "
    "and evidence-backed claims. [Simulated response — no Google API key required]",
    "Google's Gemini model would leverage its multimodal training and long context window here. "
    "It is particularly strong at reasoning tasks and technical explanations. "
    "[Simulated response — illustrating multi-provider pattern]",
]

COMPARISON_SYSTEM = (
    "You are an AI analyst comparing responses from three language models. "
    "Evaluate each response for clarity, accuracy, completeness, and practical value. "
    "Be specific about strengths and weaknesses, and give a clear recommendation."
)


@app.post("/api/multimodel")
async def multimodel_compare(request: MultiModelRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    t0 = time.time()
    claude_response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        messages=[{"role": "user", "content": request.prompt}],
    )
    claude_latency = int((time.time() - t0) * 1000)

    claude_text = claude_response.content[0].text
    input_tokens = claude_response.usage.input_tokens
    output_tokens = claude_response.usage.output_tokens
    claude_cost = (
        input_tokens / 1000 * CLAUDE_INPUT_PRICE_PER_1K
        + output_tokens / 1000 * CLAUDE_OUTPUT_PRICE_PER_1K
    )

    gpt4o_tokens  = random.randint(180, 280)
    gpt4o_cost    = gpt4o_tokens / 1000 * 0.005
    gpt4o_latency = random.randint(900, 2200)
    gpt4o_text    = random.choice(GPT4O_MOCK_RESPONSES)

    gemini_tokens  = random.randint(150, 250)
    gemini_cost    = gemini_tokens / 1000 * 0.0035
    gemini_latency = random.randint(700, 1800)
    gemini_text    = random.choice(GEMINI_MOCK_RESPONSES)

    comparison_prompt = (
        f"User prompt: \"{request.prompt}\"\n\n"
        f"Claude response: {claude_text}\n\n"
        f"GPT-4o response (simulated): {gpt4o_text}\n\n"
        f"Gemini response (simulated): {gemini_text}\n\n"
        "Which model performed best for this prompt and why? Give a 2-3 sentence recommendation."
    )

    comparison_response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        system=COMPARISON_SYSTEM,
        messages=[{"role": "user", "content": comparison_prompt}],
    )
    recommendation = comparison_response.content[0].text

    _record("multimodel", request.prompt[:60], claude_latency)

    return {
        "claude":  {"text": claude_text,  "tokens": input_tokens + output_tokens, "cost_usd": round(claude_cost, 6),  "latency_ms": claude_latency,  "mocked": False},
        "gpt4o":   {"text": gpt4o_text,   "tokens": gpt4o_tokens,                "cost_usd": round(gpt4o_cost, 6),   "latency_ms": gpt4o_latency,   "mocked": True},
        "gemini":  {"text": gemini_text,  "tokens": gemini_tokens,               "cost_usd": round(gemini_cost, 6),  "latency_ms": gemini_latency,  "mocked": True},
        "recommendation": recommendation,
    }
