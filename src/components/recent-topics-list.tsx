"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Loader2, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TopicSourceLink = {
  sourceName: string;
  title: string;
  url: string;
};

type RecentTopic = {
  id: string;
  title: string;
  category: string;
  type: string;
  status: string;
  relevanceScore: number;
  riskLevel: string;
  sources: TopicSourceLink[];
};

const STATUS_LABEL: Record<string, string> = {
  discovered: "discovered",
  brief_ready: "brief ready",
  drafted: "drafted",
  needs_review: "needs review",
  approved: "approved",
  scheduled: "scheduled",
  posted: "posted",
  rejected: "rejected",
  archived: "archived",
};

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "learning", label: "Learning" },
  { value: "news", label: "News" },
];

export function RecentTopicsList({ topics }: { topics: RecentTopic[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const topic of topics) {
      counts[topic.type] = (counts[topic.type] ?? 0) + 1;
    }
    return counts;
  }, [topics]);

  const visibleTopics = topics.filter((topic) => {
    if (filter !== "all" && topic.type !== filter) {
      return false;
    }

    if (search.trim()) {
      return topic.title.toLowerCase().includes(search.trim().toLowerCase());
    }

    return true;
  });

  async function generateBrief(topicId: string) {
    setBriefingId(topicId);
    setError(null);

    try {
      const response = await fetch("/api/research/briefs/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Brief generation failed with status ${response.status}`);
      }

      if (json.errors?.length > 0) {
        throw new Error(json.errors[0].message);
      }

      if (json.skipped?.length > 0) {
        throw new Error(json.skipped[0].reason);
      }

      router.refresh();
    } catch (briefError) {
      setError(briefError instanceof Error ? briefError.message : "Failed to generate brief.");
    } finally {
      setBriefingId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Recent topics</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Everything the agent has collected. Search or filter, then generate a brief for any
          topic directly — no need to wait for it to be picked by score.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-64 pl-8"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics…"
            value={search}
          />
        </div>
        {TYPE_FILTERS.map((item) => {
          const count =
            item.value === "all" ? topics.length : (countByType[item.value] ?? 0);
          const active = filter === item.value;

          return (
            <button
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={item.value}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label} ({count})
            </button>
          );
        })}
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
            No topics discovered yet — run discovery above to get started.
          </CardContent>
        </Card>
      ) : visibleTopics.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No topics match your search or filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleTopics.map((topic) => (
            <Card className="rounded-md" key={topic.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{topic.title}</CardTitle>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant={topic.type === "learning" ? "default" : "secondary"}>
                    {topic.type}
                  </Badge>
                  <Badge variant={topic.status === "discovered" ? "outline" : "secondary"}>
                    {STATUS_LABEL[topic.status] ?? topic.status}
                  </Badge>
                  <Badge variant="outline">{topic.category.replaceAll("_", " ")}</Badge>
                  <Badge variant="outline">{topic.relevanceScore}/100</Badge>
                  {topic.riskLevel !== "low" ? (
                    <Badge variant="destructive">{topic.riskLevel} risk</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {topic.sources.length > 0 ? (
                  <ul className="space-y-1">
                    {topic.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          href={source.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          <span className="truncate">
                            {source.sourceName} — {source.title}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {topic.status === "discovered" ? (
                  <Button
                    disabled={briefingId === topic.id}
                    onClick={() => generateBrief(topic.id)}
                    size="sm"
                    variant="outline"
                  >
                    {briefingId === topic.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Generate brief
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
