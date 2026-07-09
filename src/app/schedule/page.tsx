import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { RecentlyPublishedList } from "@/components/recently-published-list";
import { ScheduledPostsList } from "@/components/scheduled-posts-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  listPublishedPosts,
  listScheduledPosts,
} from "@/server/application/schedule-service";
import { requireCurrentUserId } from "@/server/auth/current-user";

const FLOW_STEPS = [
  "Approve a draft on the Drafts page",
  "Pick a date + time there and press Schedule — it appears here under Scheduled",
  "At that time: Copy post, Open LinkedIn, paste and publish it",
  "Press Mark as posted — it moves down to Recently published",
];

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const userId = await requireCurrentUserId();
  const [scheduled, published] = await Promise.all([
    listScheduledPosts(userId, 30),
    listPublishedPosts(userId, 10),
  ]);

  return (
    <AppShell>
      <PageHeading
        description="Approved posts wait here until you publish them on LinkedIn yourself and mark them as posted."
        title="Publishing Schedule"
      />

      <div className="mb-6 space-y-3">
        <Badge variant="secondary">
          LinkedIn API not connected — posting is manual for now
        </Badge>
        <Card className="rounded-md">
          <CardContent className="pt-6">
            <p className="mb-2 text-sm font-medium">How publishing works</p>
            <ol className="space-y-1 text-sm text-muted-foreground">
              {FLOW_STEPS.map((step, index) => (
                <li className="flex gap-2" key={step}>
                  <span className="font-mono text-xs leading-6">{index + 1}.</span>
                  <span className="leading-6">{step}</span>
                </li>
              ))}
            </ol>
            <Link
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              href="/drafts"
            >
              Go to Drafts to approve or schedule something
              <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <ScheduledPostsList
          posts={scheduled.map((post) => ({
            ...post,
            scheduledFor: post.scheduledFor.toISOString(),
          }))}
        />
        <RecentlyPublishedList
          posts={published.map((post) => ({
            ...post,
            publishedAt: post.publishedAt.toISOString(),
          }))}
        />
      </div>
    </AppShell>
  );
}
