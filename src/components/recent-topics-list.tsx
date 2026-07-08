"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { value: "news", label: "News" },
  { value: "learning", label: "Learning" },
];

export function RecentTopicsList({ topics }: { topics: RecentTopic[] }) {
  const [filter, setFilter] = useState("all");

  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const topic of topics) {
      counts[topic.type] = (counts[topic.type] ?? 0) + 1;
    }
    return counts;
  }, [topics]);

  const visibleTopics =
    filter === "all" ? topics : topics.filter((topic) => topic.type === filter);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Recent topics</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Everything the agent has collected: news found by discovery, and learning concepts
          you asked for. Filter by what you feel like posting.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
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

      {topics.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No topics discovered yet — run discovery above to get started.
          </CardContent>
        </Card>
      ) : visibleTopics.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {filter === "learning"
              ? "No learning topics yet — use the Learning topics panel above to get ideas."
              : "No news topics yet — run discovery above."}
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
              {topic.sources.length > 0 ? (
                <CardContent className="pt-0">
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
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
