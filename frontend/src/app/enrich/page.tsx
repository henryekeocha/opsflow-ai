"use client";

import { useState } from "react";
import {
  UserSearch,
  Send,
  Loader2,
  Building2,
  Target,
  MessageSquare,
  BarChart3,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const LAMBDA_URL = process.env.NEXT_PUBLIC_LAMBDA_URL || "http://localhost:8000/api/enrich";

interface EnrichedLead {
  company_summary: string;
  outreach_angle: string;
  talking_points: string[];
  confidence_score: number;
  crm_data: {
    account_tier: string;
    last_activity: string;
    open_opportunities: number;
  };
  model_used: string;
  latency_ms: number;
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="skeleton mt-1 h-4 w-64 rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="skeleton h-4 rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-4 w-4/6 rounded" />
      </CardContent>
    </Card>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums">{score}/100</span>
    </div>
  );
}

export default function EnrichPage() {
  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    job_title: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichedLead | null>(null);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error(`Lambda error: ${res.statusText}`);

      const data: EnrichedLead = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach Lambda endpoint. Check NEXT_PUBLIC_LAMBDA_URL."
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormComplete = Object.values(form).every((v) => v.trim() !== "");

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <UserSearch className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Lead Enrichment</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          AI-powered lead enrichment via AWS Lambda + API Gateway. Simulates Salesforce CRM data
          with Claude-generated insights.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Information</CardTitle>
              <CardDescription>
                Enter contact details to enrich with AI-generated insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { name: "company", label: "Company Name", placeholder: "Acme Corp" },
                  { name: "contact_name", label: "Contact Name", placeholder: "Jane Smith" },
                  { name: "job_title", label: "Job Title", placeholder: "VP of Marketing" },
                  { name: "email", label: "Email Address", placeholder: "jane@acme.com", type: "email" },
                ].map(({ name, label, placeholder, type = "text" }) => (
                  <div key={name} className="space-y-1.5">
                    <Label htmlFor={name}>{label} *</Label>
                    <input
                      id={name}
                      name={name}
                      type={type}
                      value={form[name as keyof typeof form]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      required
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                ))}

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={loading || !isFormComplete}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enriching via Lambda...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enrich Lead
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lambda info */}
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Architecture Note</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This request goes directly to an <strong>AWS Lambda function</strong> via API Gateway
              (HTTP API). The Lambda retrieves the Anthropic API key from{" "}
              <strong>AWS Secrets Manager</strong>, calls Claude, and simulates a Salesforce CRM
              lookup.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 lg:col-span-3">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <p className="text-xs text-blue-700">
                  Lambda is warming up and calling Claude...
                </p>
              </div>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {result && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between rounded-lg border bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Lead Enriched Successfully</p>
                    <p className="text-xs text-green-700">
                      {form.contact_name} @ {form.company} • {result.latency_ms}ms via{" "}
                      {result.model_used}
                    </p>
                  </div>
                </div>
                <Badge variant="success">
                  {result.crm_data.account_tier}
                </Badge>
              </div>

              {/* Company Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-primary" />
                    Company Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{result.company_summary}</p>
                </CardContent>
              </Card>

              {/* Outreach Angle */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-primary" />
                    Suggested Outreach Angle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{result.outreach_angle}</p>
                </CardContent>
              </Card>

              {/* Talking Points */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Recommended Talking Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.talking_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <p className="text-sm">{point}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Confidence & CRM */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Confidence Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConfidenceBar score={result.confidence_score} />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Based on data completeness and field quality.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">CRM Data (Salesforce Mock)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "Account Tier", value: result.crm_data.account_tier },
                      { label: "Last Activity", value: result.crm_data.last_activity },
                      {
                        label: "Open Opportunities",
                        value: result.crm_data.open_opportunities.toString(),
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!loading && !result && !error && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <UserSearch className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Fill out the form to enrich a lead with AI insights.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
