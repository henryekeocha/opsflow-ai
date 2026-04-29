import { Network, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const decisions = [
  {
    decision: "Frontend Hosting",
    choice: "Vercel",
    rationale: "Zero-config Next.js deployment, edge CDN, preview deployments per branch, instant rollbacks.",
  },
  {
    decision: "Backend Service",
    choice: "FastAPI + Docker",
    rationale: "Async support for streaming responses, typed with Pydantic, portable via containers, simple horizontal scaling.",
  },
  {
    decision: "Serverless Function",
    choice: "AWS Lambda + API Gateway",
    rationale: "Demonstrates serverless pattern; ideal for bursty, stateless workloads like lead enrichment. Pay-per-request pricing.",
  },
  {
    decision: "LLM Provider",
    choice: "Anthropic Claude",
    rationale: "Best-in-class instruction following, streaming SDK support, structured output reliability, superior system prompt adherence.",
  },
  {
    decision: "Infrastructure as Code",
    choice: "Terraform",
    rationale: "Provider-agnostic, declarative, production industry standard. Enables repeatable infrastructure and state management.",
  },
  {
    decision: "Secret Management",
    choice: "AWS Secrets Manager",
    rationale: "No hardcoded credentials anywhere. Supports automatic rotation, fine-grained IAM access control, audit logging.",
  },
  {
    decision: "Streaming Protocol",
    choice: "SSE via StreamingResponse",
    rationale: "Real-time UX without WebSocket complexity. Server-Sent Events are one-directional and perfect for LLM token streaming.",
  },
  {
    decision: "UI Component Library",
    choice: "shadcn/ui + Tailwind CSS",
    rationale: "Accessible, composable components built on Radix UI primitives. Tailwind enables rapid, consistent styling.",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">System Architecture</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Technical decisions, system diagram, and deployment overview for OpsFlow AI.
        </p>
      </div>

      {/* System Diagram */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">System Diagram</CardTitle>
          <CardDescription>High-level overview of service boundaries and data flow.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 900 420"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full max-w-4xl"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {/* Background */}
              <rect width="900" height="420" fill="#f8fafc" rx="12" />

              {/* Frontend Box */}
              <rect x="20" y="60" width="220" height="300" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
              <rect x="20" y="60" width="220" height="36" rx="10" fill="#3b82f6" />
              <rect x="20" y="84" width="220" height="12" fill="#3b82f6" />
              <text x="130" y="83" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Frontend (Vercel)</text>
              <text x="130" y="115" textAnchor="middle" fill="#475569" fontSize="10">Next.js 14 · TypeScript</text>
              <text x="130" y="130" textAnchor="middle" fill="#475569" fontSize="10">Tailwind CSS · shadcn/ui</text>

              {["Dashboard", "Content Brief (SSE)", "Model Comparator", "Lead Enrichment", "Architecture"].map((page, i) => (
                <g key={page}>
                  <rect x="40" y={150 + i * 36} width="180" height="28" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
                  <text x="130" y={168 + i * 36} textAnchor="middle" fill="#1d4ed8" fontSize="10">{page}</text>
                </g>
              ))}

              {/* Arrow: Frontend → Backend */}
              <line x1="242" y1="190" x2="330" y2="190" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)" />
              <text x="286" y="183" textAnchor="middle" fill="#64748b" fontSize="9">HTTP REST</text>
              <line x1="242" y1="260" x2="330" y2="290" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)" />
              <text x="286" y="282" textAnchor="middle" fill="#64748b" fontSize="9">API GW</text>

              {/* Backend Box */}
              <rect x="330" y="60" width="220" height="200" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
              <rect x="330" y="60" width="220" height="36" rx="10" fill="#10b981" />
              <rect x="330" y="84" width="220" height="12" fill="#10b981" />
              <text x="440" y="83" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Backend (Docker/ECS)</text>
              <text x="440" y="115" textAnchor="middle" fill="#475569" fontSize="10">FastAPI · Python 3.11</text>

              {["/api/brief (SSE)", "/api/multimodel", "/health"].map((ep, i) => (
                <g key={ep}>
                  <rect x="350" y={130 + i * 36} width="180" height="28" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                  <text x="440" y={148 + i * 36} textAnchor="middle" fill="#065f46" fontSize="10">{ep}</text>
                </g>
              ))}

              {/* Lambda Box */}
              <rect x="330" y="290" width="220" height="110" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
              <rect x="330" y="290" width="220" height="36" rx="10" fill="#f59e0b" />
              <rect x="330" y="314" width="220" height="12" fill="#f59e0b" />
              <text x="440" y="313" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">AWS Lambda</text>
              <text x="440" y="343" textAnchor="middle" fill="#475569" fontSize="10">POST /enrich-lead</text>
              <text x="440" y="360" textAnchor="middle" fill="#475569" fontSize="10">Python 3.11 · API Gateway</text>
              <text x="440" y="377" textAnchor="middle" fill="#475569" fontSize="10">Secrets Manager · CloudWatch</text>

              {/* Arrow: Backend → Claude */}
              <line x1="552" y1="165" x2="640" y2="165" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)" />
              <text x="596" y="158" textAnchor="middle" fill="#64748b" fontSize="9">Anthropic SDK</text>

              {/* Arrow: Lambda → Claude */}
              <line x1="552" y1="340" x2="640" y2="220" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)" />

              {/* Claude Box */}
              <rect x="640" y="100" width="200" height="140" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
              <rect x="640" y="100" width="200" height="36" rx="10" fill="#8b5cf6" />
              <rect x="640" y="124" width="200" height="12" fill="#8b5cf6" />
              <text x="740" y="123" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Anthropic Claude</text>
              <text x="740" y="155" textAnchor="middle" fill="#475569" fontSize="10">claude-sonnet-4-20250514</text>
              <text x="740" y="172" textAnchor="middle" fill="#475569" fontSize="10">Streaming · Multi-model</text>
              <text x="740" y="189" textAnchor="middle" fill="#475569" fontSize="10">Lead enrichment</text>
              <text x="740" y="206" textAnchor="middle" fill="#475569" fontSize="10">Eval framework</text>

              {/* AWS Box */}
              <rect x="640" y="270" width="200" height="130" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
              <rect x="640" y="270" width="200" height="36" rx="10" fill="#ef4444" />
              <rect x="640" y="294" width="200" height="12" fill="#ef4444" />
              <text x="740" y="293" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">AWS (Terraform)</text>
              {["Lambda", "API Gateway", "Secrets Manager", "CloudWatch Logs", "IAM Roles"].map((svc, i) => (
                <text key={svc} x="740" y={320 + i * 14} textAnchor="middle" fill="#475569" fontSize="9">• {svc}</text>
              ))}

              {/* Arrow marker */}
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
                </marker>
              </defs>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Architecture Decisions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Architecture Decisions</CardTitle>
          <CardDescription>Rationale behind each technology choice.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-semibold">Decision</th>
                  <th className="pb-3 font-semibold">Choice</th>
                  <th className="pb-3 font-semibold">Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {decisions.map(({ decision, choice, rationale }) => (
                  <tr key={decision}>
                    <td className="py-3 font-medium">{decision}</td>
                    <td className="py-3">
                      <Badge variant="secondary">{choice}</Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack by Layer */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            layer: "Frontend",
            color: "bg-blue-50 border-blue-200",
            titleColor: "text-blue-800",
            items: ["Next.js 14 (App Router)", "TypeScript", "Tailwind CSS", "shadcn/ui", "Vercel Deployment"],
          },
          {
            layer: "Backend",
            color: "bg-green-50 border-green-200",
            titleColor: "text-green-800",
            items: ["FastAPI", "Python 3.11", "Anthropic SDK", "Uvicorn", "Docker + Compose"],
          },
          {
            layer: "Serverless",
            color: "bg-yellow-50 border-yellow-200",
            titleColor: "text-yellow-800",
            items: ["AWS Lambda (Python)", "API Gateway HTTP API", "Secrets Manager", "CloudWatch Logs", "IAM Roles"],
          },
          {
            layer: "Infrastructure",
            color: "bg-purple-50 border-purple-200",
            titleColor: "text-purple-800",
            items: ["Terraform (HCL)", "Remote State (S3)", "State Lock (DynamoDB)", "AWS Provider", "Outputs + Variables"],
          },
        ].map(({ layer, color, titleColor, items }) => (
          <Card key={layer} className={`border ${color}`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm ${titleColor}`}>{layer}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Links */}
      <Card className="mt-8">
        <CardContent className="flex flex-wrap gap-4 p-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            GitHub Repository
          </a>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Live Frontend (Vercel)
          </a>
          <a
            href="https://docs.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Anthropic Docs
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
