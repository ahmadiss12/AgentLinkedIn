"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Loader2,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DraftForReview = {
  id: string;
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  title: string;
  hook: string;
  body: string;
  hashtags: string[];
  angle: string;
  status: string;
  currentVersion: number;
};

type EditForm = {
  title: string;
  hook: string;
  body: string;
  hashtags: string;
  angle: string;
};

const STATUS_LABEL: Record<string, string> = {
  needs_review: "needs review",
  approved: "approved",
  rejected: "rejected",
  edit_requested: "edit requested",
  regenerate_requested: "regenerate requested",
  scheduled: "scheduled",
  posted: "posted",
};

const STATUS_EXPLAINER: Record<string, string> = {
  rejected:
    'Rejected — no actions left here. The topic went back to "Ready to draft" above, so you can generate a fresh draft for it.',
  posted: "Posted — this one is live.",
  scheduled: "Scheduled — copy, post, or cancel it from the Schedule page.",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_review", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "posted", label: "Posted" },
  { value: "rejected", label: "Rejected" },
];

export function DraftReviewList({ drafts }: { drafts: DraftForReview[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [scheduleAt, setScheduleAt] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const draft of drafts) {
      counts[draft.status] = (counts[draft.status] ?? 0) + 1;
    }
    return counts;
  }, [drafts]);

  const visibleDrafts = drafts.filter((draft) => {
    if (filter !== "all" && draft.status !== filter) {
      return false;
    }

    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      return (
        draft.title.toLowerCase().includes(needle) ||
        draft.topicTitle.toLowerCase().includes(needle) ||
        draft.body.toLowerCase().includes(needle)
      );
    }

    return true;
  });

  async function callAction(draftId: string, action: string, body?: unknown) {
    setPendingId(draftId);
    setError(null);

    try {
      const response = await fetch(`/api/drafts/${draftId}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Action failed with status ${response.status}`);
      }

      setEditingId(null);
      setEditForm(null);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setPendingId(null);
    }
  }

  function startEdit(draft: DraftForReview) {
    setError(null);
    setEditingId(draft.id);
    setEditForm({
      title: draft.title,
      hook: draft.hook,
      body: draft.body,
      hashtags: draft.hashtags.join(", "),
      angle: draft.angle,
    });
  }

  function saveEdit(draftId: string) {
    if (!editForm) {
      return;
    }

    void callAction(draftId, "edit", {
      title: editForm.title,
      hook: editForm.hook,
      body: editForm.body,
      angle: editForm.angle,
      hashtags: editForm.hashtags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }

  function schedule(draftId: string) {
    const localValue = scheduleAt[draftId];

    if (!localValue) {
      setError("Pick a date and time before scheduling.");
      return;
    }

    void callAction(draftId, "schedule", { scheduledFor: new Date(localValue).toISOString() });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Drafts</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Nothing here is posted automatically. The buttons on each card depend on its status:
          drafts needing review get Approve/Reject/Edit/Regenerate, approved drafts get a
          Schedule picker, and finished ones (posted, rejected, scheduled) explain where they
          went.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-64 pl-8"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search drafts…"
            value={search}
          />
        </div>
        {FILTERS.map((item) => {
          const count =
            item.value === "all" ? drafts.length : (countByStatus[item.value] ?? 0);
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

      {drafts.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No drafts yet — generate one from the topics above.
          </CardContent>
        </Card>
      ) : visibleDrafts.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No drafts match your search or filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleDrafts.map((draft) => {
            const isPending = pendingId === draft.id;
            const isEditing = editingId === draft.id;
            const isActionable = draft.status === "needs_review";

            return (
              <Card className="rounded-md" key={draft.id}>
                <CardHeader>
                  <CardTitle className="text-base">{draft.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant={draft.status === "needs_review" ? "secondary" : "outline"}>
                      {STATUS_LABEL[draft.status] ?? draft.status}
                    </Badge>
                    <Badge variant="outline">{draft.angle}</Badge>
                    <Badge variant="outline">v{draft.currentVersion}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditing && editForm ? (
                    <div className="space-y-2">
                      <Input
                        onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                        placeholder="Title"
                        value={editForm.title}
                      />
                      <Textarea
                        onChange={(event) => setEditForm({ ...editForm, hook: event.target.value })}
                        placeholder="Hook"
                        value={editForm.hook}
                      />
                      <Textarea
                        className="min-h-32"
                        onChange={(event) => setEditForm({ ...editForm, body: event.target.value })}
                        placeholder="Body"
                        value={editForm.body}
                      />
                      <Input
                        onChange={(event) => setEditForm({ ...editForm, angle: event.target.value })}
                        placeholder="Angle"
                        value={editForm.angle}
                      />
                      <Input
                        onChange={(event) => setEditForm({ ...editForm, hashtags: event.target.value })}
                        placeholder="Hashtags, comma separated"
                        value={editForm.hashtags}
                      />
                      <div className="flex gap-2 pt-1">
                        <Button disabled={isPending} onClick={() => saveEdit(draft.id)} size="sm">
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(null);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border border-border bg-muted/40 p-3">
                        <p className="whitespace-pre-line text-sm leading-6">
                          <span className="font-medium">{draft.hook}</span>
                          {"\n\n"}
                          {draft.body}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {draft.hashtags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      {isActionable ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            disabled={isPending}
                            onClick={() => callAction(draft.id, "approve")}
                            size="sm"
                          >
                            <ThumbsUp className="size-4" />
                            Approve
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={() => callAction(draft.id, "reject")}
                            size="sm"
                            variant="destructive"
                          >
                            <ThumbsDown className="size-4" />
                            Reject
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={() => startEdit(draft)}
                            size="sm"
                            variant="outline"
                          >
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={() => callAction(draft.id, "regenerate")}
                            size="sm"
                            variant="outline"
                          >
                            {isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                            Regenerate (different angle)
                          </Button>
                        </div>
                      ) : null}
                      {draft.status === "approved" ? (
                        <div className="space-y-1 pt-1">
                          <p className="text-xs text-muted-foreground">
                            Approved — pick a date and time, then schedule it. It will appear on
                            the Schedule page.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              className="w-auto"
                              onChange={(event) =>
                                setScheduleAt({ ...scheduleAt, [draft.id]: event.target.value })
                              }
                              type="datetime-local"
                              value={scheduleAt[draft.id] ?? ""}
                            />
                            <Button disabled={isPending} onClick={() => schedule(draft.id)} size="sm">
                              {isPending ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <CalendarClock className="size-4" />
                              )}
                              Schedule
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {STATUS_EXPLAINER[draft.status] ? (
                        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                          <span>{STATUS_EXPLAINER[draft.status]}</span>
                          {draft.status === "scheduled" ? (
                            <Link
                              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                              href="/schedule"
                            >
                              Open Schedule
                              <ArrowRight className="size-3" />
                            </Link>
                          ) : null}
                          {draft.status === "posted" ? (
                            <Link
                              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                              href="/history"
                            >
                              See it in History
                              <ArrowRight className="size-3" />
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
