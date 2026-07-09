import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardSummary } from "@/server/application/dashboard-service";
import { requireCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireCurrentUserId();
  const { metrics, discoveredTopics, draftQueue, nextScheduled, recentWarnings } =
    await getDashboardSummary(userId);

  return (
    <AppShell>
      <PageHeading
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/topics">
                <Search className="size-4" />
                Run discovery
              </Link>
            </Button>
            <Button asChild>
              <Link href="/drafts">
                <Sparkles className="size-4" />
                Generate draft
              </Link>
            </Button>
          </div>
        }
        description="A personal research and content partner for computer science topics. It watches trusted sources, drafts useful LinkedIn posts, and waits for your approval."
        title="Dashboard"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card className="rounded-md" key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-semibold">
                {metric.value}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {metric.detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fresh topic candidates</h2>
            <Button asChild size="sm" variant="ghost">
              <Link href="/topics">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <Card className="rounded-md">
            {discoveredTopics.length === 0 ? (
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No topics discovered yet — run discovery from the Topics page.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead>Sources</TableHead>
                    <TableHead>Freshness</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discoveredTopics.map((topic) => (
                    <TableRow key={topic.title}>
                      <TableCell>
                        <div className="max-w-xs truncate font-medium" title={topic.title}>
                          {topic.title}
                        </div>
                        <Badge className="mt-2" variant="outline">
                          {topic.score} relevance
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {topic.source}
                      </TableCell>
                      <TableCell>{topic.freshness}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{topic.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Review queue</h2>
            <Button asChild size="sm" variant="ghost">
              <Link href="/drafts">
                Open drafts
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {draftQueue.length === 0 ? (
              <Card className="rounded-md">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  No drafts yet — generate one from the Topics page.
                </CardContent>
              </Card>
            ) : (
              draftQueue.map((draft) => (
                <Card className="rounded-md" key={draft.title}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{draft.title}</CardTitle>
                      <Badge variant="outline">{draft.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{draft.angle}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      {draft.quality}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" />
              Next scheduled slot
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {nextScheduled ? (
              <>
                <div className="font-medium text-foreground">
                  {nextScheduled.title}
                </div>
                <div className="mt-1">
                  {new Date(nextScheduled.scheduledFor).toLocaleString()}
                </div>
              </>
            ) : (
              "Nothing scheduled yet — approve a draft, then schedule it."
            )}
            <Button asChild className="mt-4 h-8 px-2" size="sm" variant="outline">
              <Link href="/schedule">
                <CalendarClock className="size-4" />
                Go to schedule
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" />
              Quality controls
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {recentWarnings.length === 0 ? (
              "No quality warnings recorded — freshness, duplication, and speculation checks run automatically during discovery."
            ) : (
              <ul className="space-y-2">
                {recentWarnings.map((item) => (
                  <li key={item.topicTitle}>
                    <span className="font-medium text-foreground">
                      {item.topicTitle}
                    </span>
                    <p className="mt-0.5 line-clamp-2">{item.warning}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4" />
              LinkedIn adapter
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No LinkedIn API is connected yet, so nothing posts automatically.
            Approve a draft, schedule it, then mark it posted yourself once
            it&apos;s live on LinkedIn.
            <Button asChild className="mt-4 h-8 px-2" size="sm" variant="outline">
              <Link href="/schedule">
                <ExternalLink className="size-4" />
                Manual publishing
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
