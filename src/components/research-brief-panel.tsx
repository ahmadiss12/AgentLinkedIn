"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ApiBriefRunResult = {
  runId: string;
  briefed: { topicId: string; title: string; confidence: string }[];
  skipped: { topicId: string; title: string; reason: string }[];
  errors: { topicId: string; title: string; message: string }[];
};

export function ResearchBriefPanel() {
  const router = useRouter();
  const [result, setResult] = useState<ApiBriefRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runBriefs() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/research/briefs/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxTopics: 5 }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Research briefs failed with status ${response.status}`);
      }

      setResult(json as ApiBriefRunResult);
      router.refresh();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Research brief generation failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI research briefs</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Turn the strongest discovered topics into source-grounded briefs, skipping stale or
            weakly-scored candidates.
          </p>
        </div>
        <Button disabled={isRunning} onClick={runBriefs}>
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate briefs
        </Button>
      </div>

      {error ? (
        <Card className="rounded-md border-destructive/40">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile label="Briefed" value={result.briefed.length} />
            <SummaryTile label="Skipped" value={result.skipped.length} />
            <SummaryTile label="Errors" value={result.errors.length} />
          </div>

          {result.briefed.length > 0 ? (
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-base">Briefed topics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.briefed.map((item) => (
                  <div className="flex items-center justify-between gap-3" key={item.topicId}>
                    <span className="text-sm">{item.title}</span>
                    <Badge variant="secondary">{item.confidence} confidence</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {result.skipped.length > 0 ? (
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-base">Skipped (did not reach the LLM)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.skipped.map((item) => (
                  <p className="text-sm text-muted-foreground" key={item.topicId}>
                    <span className="font-medium text-foreground">{item.title}:</span> {item.reason}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {result.errors.length > 0 ? (
            <Card className="rounded-md border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertTriangle className="size-4" />
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.errors.map((item) => (
                  <p className="text-sm text-muted-foreground" key={item.topicId}>
                    <span className="font-medium text-foreground">{item.title}:</span> {item.message}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card className="rounded-md">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            Ready to draft briefs for the highest-relevance discovered topics.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
