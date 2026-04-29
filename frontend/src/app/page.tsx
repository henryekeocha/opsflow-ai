"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  RefreshCcw,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface EndpointStat {
  count: number;
  avg_latency_ms: number;
}

interface ActivityItem {
  action: string;
  subject: string;
  latency_ms: number;
  ts: string;
}

interface StatsData {
  total_requests: number;
  avg_latency_ms: number;
  uptime_seconds: number;
  endpoints: {
    brief: EndpointStat;
    multimodel: EndpointStat;
    enrich: EndpointStat;
  };
  recent_activity: ActivityItem[];
  model: string;
  api_key_configured: boolean;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const features = [
  {
    href: "/brief",
    title: "Content Brief Generator",
    description: "Stream real-time AI briefs for any topic. Powered by Claude with SSE streaming.",
    badge: "Streaming",
    badgeVariant: "default" as const,
  },
  {
    href: "/compare",
    title: "Multi-Model Comparator",
    description: "Compare Claude, GPT-4o, and Gemini side-by-side. Claude recommends the winner.",
    badge: "Multi-LLM",
    badgeVariant: "secondary" as const,
  },
  {
    href: "/enrich",
    title: "Lead Enrichment",
    description: "AI-powered lead enrichment via AWS Lambda + API Gateway. Simulates Salesforce CRM.",
    badge: "Serverless",
    badgeVariant: "outline" as const,
  },
  {
    href: "/architecture",
    title: "Architecture Docs",
    description: "System diagram, technology decisions, and deployment guide for the full stack.",
    badge: "Docs",
    badgeVariant: "secondary" as const,
  },
];

const techStack = [
  { name: "Next.js 14", color: "bg-black text-white" },
  { name: "TypeScript", color: "bg-blue-600 text-white" },
  { name: "FastAPI", color: "bg-teal-600 text-white" },
  { name: "Anthropic Claude", color: "bg-orange-500 text-white" },
  { name: "AWS Lambda", color: "bg-yellow-500 text-black" },
  { name: "Terraform", color: "bg-purple-600 text-white" },
  { name: "Docker", color: "bg-blue-500 text-white" },
  { name: "Tailwind CSS", color: "bg-cyan-500 text-white" },
];

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-6">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-7 w-16 rounded" />
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/stats`, { cache: "no-store" });
      if (!res.ok) throw new Error("not ok");
      const data: StatsData = await res.json();
      setStats(data);
      setBackendOnline(true);
      setLastRefreshed(new Date());
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchStats]);

  const statCards = stats
    ? [
        {
          label: "Models Available",
          value: "3",
          sub: stats.api_key_configured ? "API key configured ✓" : "No API key set",
          icon: Brain,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Total Requests",
          value: stats.total_requests.toLocaleString(),
          sub: `Brief: ${stats.endpoints.brief.count} · Compare: ${stats.endpoints.multimodel.count} · Enrich: ${stats.endpoints.enrich.count}`,
          icon: TrendingUp,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: "Avg Latency",
          value: stats.avg_latency_ms > 0 ? `${(stats.avg_latency_ms / 1000).toFixed(1)}s` : "—",
          sub: stats.avg_latency_ms > 0 ? "Across completed requests" : "No requests yet",
          icon: Clock,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
        {
          label: "Backend Uptime",
          value: formatUptime(stats.uptime_seconds),
          sub: `Running on ${BACKEND_URL}`,
          icon: Zap,
          color: "text-orange-600",
          bg: "bg-orange-50",
        },
      ]
    : null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            AI-powered operations assistant for enterprise teams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Backend status pill */}
          {backendOnline === true && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <Wifi className="h-3 w-3" />
              Backend online
            </div>
          )}
          {backendOnline === false && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
              <WifiOff className="h-3 w-3" />
              Backend offline
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            className="gap-1.5"
            disabled={loading}
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Backend offline banner */}
      {backendOnline === false && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Backend not reachable</p>
          <p className="mt-1 text-xs text-red-700">
            Start it with:{" "}
            <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono">
              cd backend &amp;&amp; pip install -r requirements.txt &amp;&amp; uvicorn main:app --reload --port 8000
            </code>
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !statCards
          ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)
          : statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <Card key={label}>
                <CardContent className="flex items-start gap-4 p-6">
                  <div className={`rounded-lg p-2 ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Features */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Features</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ href, title, description, badge, badgeVariant }) => (
              <Card key={href} className="group transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <Badge variant={badgeVariant}>{badge}</Badge>
                  </div>
                  <CardDescription className="text-sm">{description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link href={href}>
                    <Button variant="ghost" size="sm" className="gap-1 p-0 hover:bg-transparent">
                      Try it now
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            {lastRefreshed && (
              <span className="text-xs text-muted-foreground">
                Updated {timeAgo(lastRefreshed.toISOString())}
              </span>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <ul className="divide-y">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex items-start gap-3 p-4">
                      <div className="skeleton mt-0.5 h-4 w-4 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3.5 w-3/4 rounded" />
                        <div className="skeleton h-3 w-1/2 rounded" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : stats && stats.recent_activity.length > 0 ? (
                <ul className="divide-y">
                  {stats.recent_activity.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 p-4">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.action} · {item.latency_ms}ms
                        </p>
                      </div>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {timeAgo(item.ts)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <TrendingUp className="mb-2 h-6 w-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Try generating a brief or comparing models.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Tech Stack</h2>
        <div className="flex flex-wrap gap-2">
          {techStack.map(({ name, color }) => (
            <span
              key={name}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
