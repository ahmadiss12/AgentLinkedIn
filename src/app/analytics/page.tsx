import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsSummary } from "@/server/application/dashboard-service";
import { requireCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

function DistributionCard({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: { label: string; count: number }[];
  emptyText: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card className="rounded-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{row.label}</span>
                  <span className="font-mono">{row.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const userId = await requireCurrentUserId();
  const summary = await getAnalyticsSummary(userId);

  const headline = [
    { label: "Topics discovered", value: summary.totalTopics },
    { label: "Drafts generated", value: summary.totalDrafts },
    { label: "Posts published", value: summary.totalPublished },
    {
      label: "Approval rate",
      value: summary.approvalRate === null ? "—" : `${summary.approvalRate}%`,
    },
  ];

  const sortDesc = (rows: { label: string; count: number }[]) =>
    [...rows].sort((a, b) => b.count - a.count);

  return (
    <AppShell>
      <PageHeading
        description="Content volume, review outcomes, and agent reliability — computed live from the database. LinkedIn engagement metrics will appear here if the API gets connected."
        title="Analytics"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {headline.map((metric) => (
          <Card className="rounded-md" key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-semibold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          Agent run success:{" "}
          {summary.agentRunSuccessRate === null ? "—" : `${summary.agentRunSuccessRate}%`}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Partial failures usually mean one or two feeds failed to fetch or an AI call hit its
          daily quota — not that the whole run was lost.
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DistributionCard
          emptyText="No topics yet."
          rows={sortDesc(
            summary.topicsByStatus.map((row) => ({
              label: row.status.replaceAll("_", " "),
              count: row.count,
            })),
          )}
          title="Topics by status"
        />
        <DistributionCard
          emptyText="No drafts yet."
          rows={sortDesc(
            summary.draftsByStatus.map((row) => ({
              label: row.status.replaceAll("_", " "),
              count: row.count,
            })),
          )}
          title="Drafts by status"
        />
        <DistributionCard
          emptyText="No review activity yet."
          rows={sortDesc(
            summary.reviewActions.map((row) => ({
              label: row.action.replaceAll("_", " "),
              count: row.count,
            })),
          )}
          title="Review decisions"
        />
        <DistributionCard
          emptyText="No quality checks yet."
          rows={sortDesc(
            summary.qualitySignals.map((row) => ({
              label: row.signal.replaceAll("_", " "),
              count: row.count,
            })),
          )}
          title="Quality signals"
        />
      </div>
    </AppShell>
  );
}
