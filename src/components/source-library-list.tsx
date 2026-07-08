"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type SourceView = {
  id: string;
  name: string;
  url: string;
  type: string;
  trustLevel: number;
  enabled: boolean;
  lastFetchedAt: string | null;
  itemCount: number;
};

export function SourceLibraryList({ sources }: { sources: SourceView[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(source: SourceView) {
    setPendingId(source.id);
    setError(null);

    try {
      const response = await fetch(`/api/sources/${source.id}/toggle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !source.enabled }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Toggle failed with status ${response.status}`);
      }

      router.refresh();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Toggle failed.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="space-y-3">
      {error ? (
        <Card className="rounded-md border-destructive/40">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => (
          <Card
            className={source.enabled ? "rounded-md" : "rounded-md opacity-60"}
            key={source.id}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{source.name}</CardTitle>
                <Switch
                  checked={source.enabled}
                  disabled={pendingId === source.id}
                  onCheckedChange={() => toggle(source)}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline">{source.type.replaceAll("_", " ")}</Badge>
                <Badge variant="secondary">trust {source.trustLevel}/5</Badge>
                <Badge variant="outline">{source.itemCount} items</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                {source.lastFetchedAt
                  ? `Last fetched ${new Date(source.lastFetchedAt).toLocaleString()}`
                  : "Never fetched yet"}
              </p>
              <a
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-3" />
                Feed URL
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
