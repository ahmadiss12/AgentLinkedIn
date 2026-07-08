"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ApiCandidate = {
  title: string;
  summary: string;
  whyItMatters: string;
  url: string;
  sourceName: string;
  sourceType: string;
  category: string;
  publishedAt?: string;
  freshnessDays: number;
  relevanceScore: number;
  noveltyScore: number;
  sourceStrength: number;
  signals: string[];
  warnings: string[];
  quality?: {
    signals: string[];
    duplicateScore: number;
    duplicateOf?: string;
    freshnessScore: number;
    sourceCoverageScore: number;
  };
};

type ApiRunResult = {
  runId: string;
  persisted: boolean;
  sourcesChecked: number;
  itemsFetched: number;
  candidates: ApiCandidate[];
  errors: { sourceName: string; url: string; message: string }[];
};

export function DiscoveryRunPanel() {
  const router = useRouter();
  const [result, setResult] = useState<ApiRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDiscovery() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/discovery/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxItemsPerSource: 6, maxCandidates: 12 }),
      });

      if (!response.ok) {
        throw new Error(`Discovery failed with status ${response.status}`);
      }

      setResult((await response.json()) as ApiRunResult);
      router.refresh();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Discovery failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Manual discovery run</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Fetch trusted feeds, score fresh items, and return candidates for
            review.
          </p>
        </div>
        <Button disabled={isRunning} onClick={runDiscovery}>
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Run discovery
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
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryTile label="Sources checked" value={result.sourcesChecked} />
            <SummaryTile label="Items fetched" value={result.itemsFetched} />
            <SummaryTile label="Candidates ranked" value={result.candidates.length} />
            <SummaryTile label="Persisted" value={result.persisted ? "Yes" : "Preview"} />
          </div>

          {result.errors.length > 0 ? (
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4" />
                  Source warnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.errors.slice(0, 5).map((sourceError) => (
                  <p className="text-sm text-muted-foreground" key={sourceError.url}>
                    <span className="font-medium text-foreground">
                      {sourceError.sourceName}:
                    </span>{" "}
                    {sourceError.message}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {result.candidates.map((candidate) => (
              <Card className="rounded-md" key={candidate.url}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="max-w-xl text-base">
                      {candidate.title}
                    </CardTitle>
                    <Badge variant="secondary">
                      {candidate.relevanceScore}/100
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline">{formatToken(candidate.category)}</Badge>
                    <Badge variant="outline">{candidate.sourceName}</Badge>
                    <Badge variant="outline">
                      {candidate.freshnessDays === 0
                        ? "fresh today"
                        : `${candidate.freshnessDays}d old`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {candidate.summary}
                  </p>
                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <p className="text-sm leading-6">{candidate.whyItMatters}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidate.quality?.signals.map((signal) => (
                      <Badge
                        key={signal}
                        variant={signal === "strong_sources" ? "secondary" : "outline"}
                      >
                        {formatToken(signal)}
                      </Badge>
                    ))}
                    {candidate.signals.slice(0, 5).map((signal) => (
                      <Badge key={signal} variant="secondary">
                        {signal}
                      </Badge>
                    ))}
                    {candidate.warnings.map((warning) => (
                      <Badge key={warning} variant="destructive">
                        {warning}
                      </Badge>
                    ))}
                  </div>
                  <Button asChild className="h-8 px-2" size="sm" variant="outline">
                    <a href={candidate.url} rel="noreferrer" target="_blank">
                      <ExternalLink className="size-4" />
                      Source
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="rounded-md">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            Ready to scan the trusted source catalog.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function formatToken(value: string) {
  return value.replaceAll("_", " ");
}
