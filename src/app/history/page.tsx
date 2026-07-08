import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Pencil,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listAgentRuns,
  listPostedHistory,
  listReviewTimeline,
} from "@/server/application/dashboard-service";

export const dynamic = "force-dynamic";

const ACTION_META: Record<string, { label: string; icon: typeof ThumbsUp }> = {
  approve: { label: "approved", icon: ThumbsUp },
  reject: { label: "rejected", icon: ThumbsDown },
  edit: { label: "edited", icon: Pencil },
  regenerate: { label: "regenerated", icon: RefreshCw },
  schedule: { label: "scheduled", icon: CalendarClock },
  cancel_schedule: { label: "schedule cancelled", icon: X },
  mark_posted: { label: "marked posted", icon: Send },
};

const RUN_KIND_LABEL: Record<string, string> = {
  topic_discovery: "topic discovery",
  research_brief: "research brief",
  draft_generation: "draft generation",
};

export default async function HistoryPage() {
  const [timeline, runs, posted] = await Promise.all([
    listReviewTimeline(50),
    listAgentRuns(30),
    listPostedHistory(20),
  ]);

  return (
    <AppShell>
      <PageHeading
        description="Every review decision, agent run, and published post — the full memory of what happened and when."
        title="Post History"
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold">Review timeline</h2>
          {timeline.length === 0 ? (
            <Card className="rounded-md">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No review activity yet.
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-md">
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {timeline.map((event) => {
                    const meta = ACTION_META[event.action];
                    const Icon = meta?.icon ?? CheckCircle2;

                    return (
                      <li className="flex gap-3" key={event.id}>
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">
                              {meta?.label ?? event.action}
                            </span>{" "}
                            — {event.draftTitle}
                          </p>
                          {event.note ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {event.note}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {event.createdAt.toLocaleString()}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Published posts</h2>
            {posted.length === 0 ? (
              <Card className="rounded-md">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Nothing published yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {posted.map((post) => (
                  <Card className="rounded-md" key={post.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{post.draftTitle}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Badge variant="outline">{post.angle}</Badge>
                        <Badge variant="secondary">
                          {post.publishedAt.toLocaleDateString()}
                        </Badge>
                        {post.publishedUrl ? (
                          <a
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                            href={post.publishedUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="size-3" />
                            View on LinkedIn
                          </a>
                        ) : null}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Agent runs</h2>
            {runs.length === 0 ? (
              <Card className="rounded-md">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  No agent runs recorded yet.
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-md">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {runs.map((run) => (
                      <li className="flex items-start gap-3" key={run.id}>
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                          <Bot className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {RUN_KIND_LABEL[run.kind] ?? run.kind}
                            </span>
                            <Badge
                              variant={run.status === "success" ? "secondary" : "destructive"}
                            >
                              {run.status.replaceAll("_", " ")}
                            </Badge>
                          </div>
                          {run.summary ? (
                            <p className="text-xs text-muted-foreground">{run.summary}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {run.startedAt.toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
