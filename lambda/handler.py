"""
OpsFlow AI — AWS Lambda Lead Enrichment Handler
================================================
Invoked via API Gateway (HTTP API) POST /enrich-lead.

Flow:
  1. Parse + validate the incoming lead payload
  2. Retrieve the Anthropic API key from AWS Secrets Manager
  3. Call Claude to generate enrichment content
  4. Simulate a Salesforce CRM lookup (mock)
  5. Return the enriched lead as JSON

Environment variables (set by Terraform):
  SECRET_NAME  — name of the Secrets Manager secret that stores the API key
  ENVIRONMENT  — "prod" | "staging" | "dev"
"""

import json
import os
import random
import time
from datetime import datetime, timedelta

import anthropic
import boto3
from botocore.exceptions import ClientError

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL = "claude-sonnet-4-20250514"
SECRET_NAME = os.environ.get("SECRET_NAME", "opsflow-ai/anthropic-api-key")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

# ---------------------------------------------------------------------------
# Secrets Manager helper
# ---------------------------------------------------------------------------

_cached_secret: str | None = None


def get_anthropic_api_key() -> str:
    """Retrieve the Anthropic API key from AWS Secrets Manager.

    The secret is cached in the Lambda execution environment for the lifetime
    of the container to avoid redundant network calls on warm invocations.
    """
    global _cached_secret
    if _cached_secret:
        return _cached_secret

    client = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION", "us-east-1"))
    try:
        response = client.get_secret_value(SecretId=SECRET_NAME)
    except ClientError as e:
        raise RuntimeError(f"Failed to retrieve secret '{SECRET_NAME}': {e}") from e

    secret_string = response.get("SecretString", "{}")
    try:
        secret_data = json.loads(secret_string)
        _cached_secret = secret_data.get("ANTHROPIC_API_KEY") or secret_string
    except json.JSONDecodeError:
        # If the secret is stored as a plain string (not JSON), use it directly
        _cached_secret = secret_string

    return _cached_secret


# ---------------------------------------------------------------------------
# Salesforce mock
# ---------------------------------------------------------------------------

ACCOUNT_TIERS = ["Enterprise", "Mid-Market", "SMB", "Strategic"]


def simulate_salesforce_lookup(company: str) -> dict:
    """Simulate a Salesforce CRM data pull.

    In production this would call the Salesforce REST API using OAuth 2.0
    client credentials. Here we return deterministic-ish mock data seeded
    by the company name to keep results consistent per company.
    """
    seed = sum(ord(c) for c in company)
    rng = random.Random(seed)

    last_activity_days_ago = rng.randint(5, 120)
    last_activity = (datetime.utcnow() - timedelta(days=last_activity_days_ago)).strftime(
        "%Y-%m-%d"
    )

    return {
        "account_tier": rng.choice(ACCOUNT_TIERS),
        "last_activity": last_activity,
        "open_opportunities": rng.randint(0, 5),
    }


# ---------------------------------------------------------------------------
# Confidence score
# ---------------------------------------------------------------------------


def calculate_confidence(company: str, contact_name: str, job_title: str, email: str) -> int:
    """Score (0-100) how complete and enrichable the lead data is."""
    score = 0
    if company and len(company) > 2:
        score += 25
    if contact_name and " " in contact_name:  # Has first + last name
        score += 20
    if job_title and len(job_title) > 3:
        score += 25
    if email and "@" in email and "." in email.split("@")[-1]:
        score += 20
    # Bonus: company domain matches email domain
    company_slug = company.lower().replace(" ", "").replace(",", "").replace(".", "")
    email_domain = email.split("@")[-1].split(".")[0].lower() if "@" in email else ""
    if email_domain and email_domain in company_slug:
        score += 10
    return min(score, 100)


# ---------------------------------------------------------------------------
# Claude enrichment prompt
# ---------------------------------------------------------------------------

ENRICHMENT_SYSTEM = """You are an expert B2B sales intelligence analyst.
Given a lead's company and contact information, generate:
1. A concise 2-sentence company summary
2. A personalized outreach angle tailored to the contact's role
3. Exactly 3 bullet-point talking points relevant to the contact's position

Respond in this exact JSON format:
{
  "company_summary": "...",
  "outreach_angle": "...",
  "talking_points": ["...", "...", "..."]
}"""


def enrich_with_claude(
    company: str, contact_name: str, job_title: str, email: str, api_key: str
) -> dict:
    client = anthropic.Anthropic(api_key=api_key)

    user_prompt = (
        f"Company: {company}\n"
        f"Contact: {contact_name}\n"
        f"Title: {job_title}\n"
        f"Email: {email}\n\n"
        "Generate the enrichment data as specified."
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=ENRICHMENT_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )

    text = response.content[0].text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
    if text.endswith("```"):
        text = "\n".join(text.split("\n")[:-1])

    return json.loads(text)


# ---------------------------------------------------------------------------
# CORS headers helper
# ---------------------------------------------------------------------------


def cors_headers() -> dict:
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------


def lambda_handler(event: dict, context) -> dict:
    """Entry point for AWS Lambda invocations via API Gateway HTTP API."""

    # Handle CORS pre-flight
    if event.get("requestContext", {}).get("http", {}).get("method", "") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    # Parse body
    try:
        if isinstance(event.get("body"), str):
            body = json.loads(event["body"])
        elif isinstance(event.get("body"), dict):
            body = event["body"]
        else:
            body = event  # Direct invocation (e.g., via SAM local)
    except (json.JSONDecodeError, TypeError):
        return {
            "statusCode": 400,
            "headers": cors_headers(),
            "body": json.dumps({"error": "Invalid JSON body"}),
        }

    # Validate required fields
    required = ["company", "contact_name", "job_title", "email"]
    missing = [f for f in required if not body.get(f, "").strip()]
    if missing:
        return {
            "statusCode": 422,
            "headers": cors_headers(),
            "body": json.dumps({"error": f"Missing required fields: {', '.join(missing)}"}),
        }

    company = body["company"].strip()
    contact_name = body["contact_name"].strip()
    job_title = body["job_title"].strip()
    email = body["email"].strip()

    t0 = time.time()

    try:
        api_key = get_anthropic_api_key()
        enrichment = enrich_with_claude(company, contact_name, job_title, email, api_key)
        crm_data = simulate_salesforce_lookup(company)
        confidence = calculate_confidence(company, contact_name, job_title, email)
        latency_ms = int((time.time() - t0) * 1000)

        result = {
            "company_summary": enrichment["company_summary"],
            "outreach_angle": enrichment["outreach_angle"],
            "talking_points": enrichment["talking_points"],
            "confidence_score": confidence,
            "crm_data": crm_data,
            "model_used": MODEL,
            "latency_ms": latency_ms,
        }

        return {
            "statusCode": 200,
            "headers": {**cors_headers(), "Content-Type": "application/json"},
            "body": json.dumps(result),
        }

    except json.JSONDecodeError as e:
        return {
            "statusCode": 502,
            "headers": cors_headers(),
            "body": json.dumps({"error": f"Claude returned invalid JSON: {str(e)}"}),
        }
    except RuntimeError as e:
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": str(e)}),
        }
    except Exception as e:  # noqa: BLE001
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": f"Unexpected error: {str(e)}"}),
        }
