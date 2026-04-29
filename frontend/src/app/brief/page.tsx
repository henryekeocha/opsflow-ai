"use client";

import { useState } from "react";
import {
  FileText,
  Send,
  RefreshCcw,
  Copy,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const audienceOptions = [
  "Healthcare Executives (C-Suite)",
  "Clinical Staff & Nurses",
  "Health IT Professionals",
  "Medical Researchers",
  "Insurance & Payer Teams",
  "Pharma & Biotech Leaders",
  "General Healthcare Consumers",
];

const contentTypeOptions = [
  { value: "article", label: "Long-form Article" },
  { value: "newsletter", label: "Newsletter Issue" },
  { value: "social", label: "Social Media Post" },
];

function parseBriefSections(text: string) {
  const sections: Record<string, string> = {};
  const lines = text.split("\n");
  let currentSection = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#+\s+(.+)$/) || line.match(/^\d+\.\s+\*\*(.+)\*\*/) || line.match(/^\*\*(.+)\*\*/);
    if (headingMatch) {
      if (currentSection && currentContent.length) {
        sections[currentSection] = currentContent.join("\n").trim();
      }
      currentSection = headingMatch[1].replace(/[*#]/g, "").trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  if (currentSection && currentContent.length) {
    sections[currentSection] = currentContent.join("\n").trim();
  }
  return sections;
}

export default function BriefPage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [contentType, setContentType] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!topic.trim() || !audience || !contentType) return;

    setStreaming(true);
    setStreamedText("");
    setDone(false);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, audience, content_type: contentType }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;
        const chunk = decoder.decode(value, { stream: true });
        setStreamedText((prev) => prev + chunk);
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Is the backend running?");
    } finally {
      setStreaming(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(streamedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    handleSubmit();
  };

  const sections = done ? parseBriefSections(streamedText) : {};
  const hasSections = Object.keys(sections).length > 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Content Brief Generator</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Generate structured editorial briefs powered by Claude with real-time streaming.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brief Parameters</CardTitle>
              <CardDescription>Configure your content brief request.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., AI-powered diagnostics in radiology"
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Audience *</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience..." />
                    </SelectTrigger>
                    <SelectContent>
                      {audienceOptions.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Content Type *</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypeOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={streaming || !topic.trim() || !audience || !contentType}
                >
                  {streaming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Generate Brief
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Stream indicator */}
          {streaming && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <p className="text-xs text-blue-700">Streaming response from Claude...</p>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="lg:col-span-3">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {(streaming || streamedText) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Generated Brief</CardTitle>
                  <CardDescription>
                    {done ? "Generation complete" : "Streaming from Claude..."}
                  </CardDescription>
                </div>
                {done && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                      {copied ? (
                        <><CheckCheck className="h-3 w-3" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3" /> Copy</>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-1">
                      <RefreshCcw className="h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {hasSections ? (
                  <div className="space-y-4">
                    {Object.entries(sections).map(([title, content]) => (
                      <div key={title} className="rounded-lg border bg-muted/30 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-primary">{title}</h3>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      streaming ? "streaming-cursor" : ""
                    }`}
                  >
                    {streamedText}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!streaming && !streamedText && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Fill out the form and click &quot;Generate Brief&quot; to see your AI-generated content
                  brief stream in real time.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
