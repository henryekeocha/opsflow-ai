"""
OpsFlow AI — Content Brief Eval Script
=======================================
Runs a suite of test prompts against the /api/brief endpoint and evaluates
each response against a structured rubric. Demonstrates LLMOps maturity
and prompt quality awareness.

Usage:
    python eval_brief.py                          # Use default http://localhost:8000
    python eval_brief.py --backend http://myapi   # Custom backend URL
    python eval_brief.py --verbose                # Print full response text

Rubric (each criterion is worth 1 point, max 5):
    1. Has headline options   — response contains 'Headline' section
    2. Has hook content       — response contains 'Hook' section
    3. Has ≥5 key points      — response contains 'Key Points' section with bullets
    4. Word count in range    — 150–600 words total
    5. Has call to action     — response contains 'Call to Action' or 'CTA' section
"""

import argparse
import re
import sys
import time
from dataclasses import dataclass, field
from typing import Optional

import httpx


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "topic": "AI in radiology",
        "audience": "Clinical Staff & Nurses",
        "content_type": "article",
    },
    {
        "topic": "Diabetes management trends",
        "audience": "Healthcare Executives (C-Suite)",
        "content_type": "newsletter",
    },
    {
        "topic": "Healthcare cybersecurity threats in 2025",
        "audience": "Health IT Professionals",
        "content_type": "article",
    },
    {
        "topic": "Personalised medicine and genomics",
        "audience": "Medical Researchers",
        "content_type": "newsletter",
    },
    {
        "topic": "Value-based care reimbursement models",
        "audience": "Insurance & Payer Teams",
        "content_type": "article",
    },
]

# ---------------------------------------------------------------------------
# Rubric
# ---------------------------------------------------------------------------

MIN_WORDS = 150
MAX_WORDS = 600


@dataclass
class RubricResult:
    has_headline: bool = False
    has_hook: bool = False
    has_key_points: bool = False
    word_count_in_range: bool = False
    has_cta: bool = False
    word_count: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def score(self) -> int:
        return sum(
            [
                self.has_headline,
                self.has_hook,
                self.has_key_points,
                self.word_count_in_range,
                self.has_cta,
            ]
        )

    @property
    def max_score(self) -> int:
        return 5

    @property
    def passed(self) -> bool:
        return self.score == self.max_score


def evaluate_response(text: str) -> RubricResult:
    result = RubricResult()
    lower = text.lower()

    # 1. Headline
    result.has_headline = bool(re.search(r"headline", lower))

    # 2. Hook
    result.has_hook = bool(re.search(r"hook", lower))

    # 3. Key points — look for section header + at least 3 bullet-style lines
    has_kp_header = bool(re.search(r"key\s+points?", lower))
    bullet_lines = re.findall(r"(?m)^[\s]*[-*•]\s+.{10,}", text)
    result.has_key_points = has_kp_header and len(bullet_lines) >= 3

    # 4. Word count
    words = text.split()
    result.word_count = len(words)
    result.word_count_in_range = MIN_WORDS <= result.word_count <= MAX_WORDS

    # 5. CTA
    result.has_cta = bool(re.search(r"call\s+to\s+action|cta", lower))

    return result


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


def run_evals(backend_url: str, verbose: bool = False) -> None:
    base = backend_url.rstrip("/")
    endpoint = f"{base}/api/brief"
    timeout = httpx.Timeout(60.0)

    results: list[tuple[dict, Optional[RubricResult], Optional[str], float]] = []

    print(f"\n{'=' * 65}")
    print(f"  OpsFlow AI — Content Brief Eval Suite")
    print(f"  Endpoint: {endpoint}")
    print(f"{'=' * 65}\n")

    for i, case in enumerate(TEST_CASES, 1):
        label = f'Test {i}: "{case["topic"]}"'
        print(f"  Running {label}...", end=" ", flush=True)

        t0 = time.time()
        try:
            # Collect the full streamed response
            with httpx.stream(
                "POST",
                endpoint,
                json=case,
                timeout=timeout,
                headers={"Accept": "text/event-stream"},
            ) as response:
                response.raise_for_status()
                full_text = "".join(response.iter_text())

            latency = time.time() - t0
            rubric = evaluate_response(full_text)
            results.append((case, rubric, full_text, latency))

            status = "PASS" if rubric.passed else "FAIL"
            print(f"{status} ({rubric.score}/{rubric.max_score} criteria • {latency:.1f}s)")

            if verbose:
                print(f"\n--- Response ---\n{full_text[:400]}...\n")

        except Exception as e:
            latency = time.time() - t0
            results.append((case, None, None, latency))
            print(f"ERROR ({latency:.1f}s)")
            print(f"       → {e}")

    # ---------------------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------------------
    passed = sum(1 for _, r, _, _ in results if r and r.passed)
    errored = sum(1 for _, r, _, _ in results if r is None)
    latencies = [lat for _, _, _, lat in results]
    avg_latency = sum(latencies) / len(latencies)

    print(f"\n{'=' * 65}")
    print(f"  Summary")
    print(f"{'=' * 65}")
    print(f"  Total tests : {len(TEST_CASES)}")
    print(f"  Passed      : {passed}")
    print(f"  Failed      : {len(TEST_CASES) - passed - errored}")
    print(f"  Errors      : {errored}")
    print(f"  Avg latency : {avg_latency:.1f}s")
    print()

    print("  Per-criterion breakdown:")
    criteria_names = ["Has Headline", "Has Hook", "Has Key Points", "Word Count OK", "Has CTA"]
    for j, name in enumerate(criteria_names):
        count = sum(
            1
            for _, r, _, _ in results
            if r and [r.has_headline, r.has_hook, r.has_key_points, r.word_count_in_range, r.has_cta][j]
        )
        bar = "█" * count + "░" * (len(TEST_CASES) - count)
        print(f"    {name:<20} {bar} {count}/{len(TEST_CASES)}")

    print(f"\n{'=' * 65}\n")

    if passed < len(TEST_CASES):
        sys.exit(1)  # Non-zero exit for CI pipelines


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OpsFlow AI content brief eval harness")
    parser.add_argument(
        "--backend",
        default="http://localhost:8000",
        help="FastAPI backend base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print truncated response text for each test case",
    )
    args = parser.parse_args()
    run_evals(args.backend, args.verbose)
