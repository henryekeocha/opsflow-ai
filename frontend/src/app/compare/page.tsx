"use client";

import { useState } from "react";
import {
  GitCompare,
  Send,
  Loader2,
  Trophy,
  Clock,
  Hash,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface ModelResult {
  text: string;
  tokens: number;
  cost_usd: number;
  latency_ms: number;
  mocked?: boolean;
}

interface CompareResult {
  claude: ModelResult;
  gpt4o: ModelResult;
  gemini: ModelResult;
  recommendation: string;
}

const modelConfig = {
  claude: {
    name: "Claude Sonnet",
    provider: "Anthropic",
    color: "border-orange-200 bg-orange-50",
    badge: "bg-orange-100 text-orange-800",
    labelColor: "text-orange-700",
  },
  gpt4o: {
    name: "GPT-4o",
    provider: "OpenAI",
    color: "border-green-200 bg-green-50",
    badge: "bg-green-100 text-green-800",
    labelColor: "text-green-700",
  },
  gemini: {
    name: "Gemini Pro",
    provider: "Google",
    color: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    labelColor: "text-blue-700",
  },
};

function MetricPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs shadow-sm">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function SkeletonPanel({ modelKey }: { modelKey: keyof typeof modelConfig }) {
  const cfg = modelConfig[modelKey];
  return (
    <Card className={`border-2 ${cfg.color}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold ${cfg.labelColor}`}>{cfg.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
            {cfg.provider}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="skeleton h-4 rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-4 w-4/6 rounded" />
        <div className="skeleton mt-4 h-4 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
      </CardContent>
    </Card>
  );
}

export default function ComparePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/multimodel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);

      const data: CompareResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Multi-Model Comparator</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Compare AI model responses side-by-side. Claude makes the real API call; GPT-4o and Gemini use
          simulated responses to demonstrate the pattern.
        </p>
      </div>

      {/* Prompt Form */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="prompt">Your Prompt</Label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., What are the most promising applications of AI in healthcare for 2025?"
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading || !prompt.trim()} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Compare
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Model Panels */}
      {loading ? (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {(["claude", "gpt4o", "gemini"] as const).map((key) => (
            <SkeletonPanel key={key} modelKey={key} />
          ))}
        </div>
      ) : result ? (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            {(["claude", "gpt4o", "gemini"] as const).map((key) => {
              const cfg = modelConfig[key];
              const data = result[key];
              return (
                <Card key={key} className={`border-2 ${cfg.color}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${cfg.labelColor}`}>{cfg.name}</span>
                      <div className="flex items-center gap-1">
                        {data.mocked && (
                          <Badge variant="outline" className="text-[10px]">
                            Simulated
                          </Badge>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          {cfg.provider}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <MetricPill icon={Hash} label="Tokens" value={data.tokens.toLocaleString()} />
                      <MetricPill
                        icon={DollarSign}
                        label="Cost"
                        value={`$${data.cost_usd.toFixed(4)}`}
                      />
                      <MetricPill icon={Clock} label="Latency" value={`${data.latency_ms}ms`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recommendation */}
          <Card className="border-2 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-yellow-800">
                <Trophy className="h-5 w-5" />
                Claude&apos;s Recommendation
              </CardTitle>
              <CardDescription className="text-yellow-700">
                Analysis of all three model responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-yellow-900">
                {result.recommendation}
              </p>
            </CardContent>
          </Card>

          {/* Summary Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold">Model</th>
                    <th className="pb-2 font-semibold">Provider</th>
                    <th className="pb-2 font-semibold">Tokens</th>
                    <th className="pb-2 font-semibold">Est. Cost</th>
                    <th className="pb-2 font-semibold">Latency</th>
                    <th className="pb-2 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(["claude", "gpt4o", "gemini"] as const).map((key) => {
                    const cfg = modelConfig[key];
                    const data = result[key];
                    return (
                      <tr key={key}>
                        <td className={`py-2 font-medium ${cfg.labelColor}`}>{cfg.name}</td>
                        <td className="py-2 text-muted-foreground">{cfg.provider}</td>
                        <td className="py-2">{data.tokens.toLocaleString()}</td>
                        <td className="py-2">${data.cost_usd.toFixed(4)}</td>
                        <td className="py-2">{data.latency_ms}ms</td>
                        <td className="py-2">
                          {data.mocked ? (
                            <Badge variant="outline">Simulated</Badge>
                          ) : (
                            <Badge variant="success">Live API</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <GitCompare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Enter a prompt and click Compare to see model responses side-by-side.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
