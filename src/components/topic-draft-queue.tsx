"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, PenSquare, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TopicReadyToDraft = {
  id: string;
  title: string;
  category: string;
  type: string;
  brief: {
    whyItMatters: string;
    confidence: string;
    warnings: string[];
  };
};

export function TopicDraftQueue({ topics }: { topics: TopicReadyToDraft[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const visibleTopics = search.trim()
    ? topics.filter((topic) =>
        topic.title.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : topics;

  async function generate(topicId: string) {
    setPendingId(topicId);
    setError(null);

    try {
      const response = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Draft generation failed with status ${response.status}`);
      }

      if (json.errors?.length > 0) {
        throw new Error(json.errors[0].message);
      }

      router.refresh();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Failed to generate draft.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Ready to draft</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Topics with a research brief, learning topics first. Pick one to draft — nothing is
          auto-selected.
        </p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search briefed topics…"
          value={search}
        />
      </div>

      {error ? (
        <Card className="rounded-md border-destructive/40">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      {topics.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No briefed topics are waiting to be drafted right now.
          </CardContent>
        </Card>
      ) : visibleTopics.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No briefed topics match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleTopics.map((topic) => (
            <Card className="rounded-md" key={topic.id}>
              <CardHeader>
                <CardTitle className="text-base">{topic.title}</CardTitle>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant={topic.type === "learning" ? "default" : "secondary"}>
                    {topic.type === "learning" ? "learning" : "news"}
                  </Badge>
                  <Badge variant="outline">{topic.category.replaceAll("_", " ")}</Badge>
                  <Badge variant={topic.brief.confidence === "high" ? "secondary" : "outline"}>
                    {topic.brief.confidence} confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">{topic.brief.whyItMatters}</p>
                <Button
                  disabled={pendingId === topic.id}
                  onClick={() => generate(topic.id)}
                  size="sm"
                >
                  {pendingId === topic.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PenSquare className="size-4" />
                  )}
                  Generate draft
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
