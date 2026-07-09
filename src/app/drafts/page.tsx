import { AppShell } from "@/components/app-shell";
import { DraftReviewList } from "@/components/draft-review-list";
import { PageHeading } from "@/components/page-heading";
import { TopicDraftQueue } from "@/components/topic-draft-queue";
import { Badge } from "@/components/ui/badge";
import {
  listDraftsForReview,
  listTopicsReadyToDraft,
} from "@/server/application/draft-review-service";
import { requireCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const userId = await requireCurrentUserId();
  const [topics, drafts] = await Promise.all([
    listTopicsReadyToDraft(userId, 20),
    listDraftsForReview(userId, 30),
  ]);

  return (
    <AppShell>
      <PageHeading
        description="Generated LinkedIn posts wait here for approval, edits, rejection, or a new angle."
        title="Draft Review"
      />

      <div className="mb-6">
        <Badge variant="secondary">Review required — nothing is posted automatically</Badge>
      </div>

      <div className="space-y-8">
        <TopicDraftQueue topics={topics} />
        <DraftReviewList drafts={drafts} />
      </div>
    </AppShell>
  );
}
