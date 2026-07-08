import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TopicSourceLink = {
  sourceName: string;
  title: string;
  url: string;
};

type RecentTopic = {
  id: string;
  title: string;
  category: string;
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

export function RecentTopicsList({ topics }: { topics: RecentTopic[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Recent topics</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Everything the discovery agent has found so far, most recently seen first. This list is
          loaded from the database, so it stays here when you navigate away and come back.
        </p>
      </div>

      {topics.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No topics discovered yet — run discovery above to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {topics.map((topic) => (
            <Card className="rounded-md" key={topic.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{topic.title}</CardTitle>
                <div className="flex flex-wrap gap-2 pt-2">
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
