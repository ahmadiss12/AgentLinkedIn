"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ScheduledPost = {
  id: string;
  draftId: string;
  draftTitle: string;
  hook: string;
  body: string;
  hashtags: string[];
  scheduledFor: string;
  status: string;
  attempts: number;
  lastError: string | null;
};

function formatPostText(post: ScheduledPost) {
  const hashtags = post.hashtags.map((tag) => `#${tag}`).join(" ");
  return `${post.hook}\n\n${post.body}\n\n${hashtags}`;
}

export function ScheduledPostsList({ posts }: { posts: ScheduledPost[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function copyPost(post: ScheduledPost) {
    setError(null);

    try {
      await navigator.clipboard.writeText(formatPostText(post));
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setError("Could not copy to clipboard — copy the text manually from the Drafts page.");
    }
  }

  async function callAction(scheduledPostId: string, action: string, body?: unknown) {
    setPendingId(scheduledPostId);
    setError(null);

    try {
      const response = await fetch(`/api/schedule/${scheduledPostId}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Action failed with status ${response.status}`);
      }

      setMarkingId(null);
      setPublishedUrl("");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Scheduled ({posts.length})</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Posts waiting to be published. Once you mark one as posted, it moves down to
          &quot;Recently published&quot; — it doesn&apos;t disappear.
        </p>
      </div>

      {error ? (
        <Card className="rounded-md border-destructive/40">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      {posts.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nothing scheduled yet — schedule an approved draft from the Drafts page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {posts.map((post) => {
            const isPending = pendingId === post.id;
            const isMarking = markingId === post.id;

            return (
              <Card className="rounded-md" key={post.id}>
                <CardHeader>
                  <CardTitle className="text-base">{post.draftTitle}</CardTitle>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary">{post.status}</Badge>
                    <Badge variant="outline">
                      {new Date(post.scheduledFor).toLocaleString()}
                    </Badge>
                    {post.lastError ? <Badge variant="destructive">{post.lastError}</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {post.hook}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  {isMarking ? (
                    <div className="space-y-2">
                      <Input
                        onChange={(event) => setPublishedUrl(event.target.value)}
                        placeholder="LinkedIn post URL (optional)"
                        value={publishedUrl}
                      />
                      <div className="flex gap-2">
                        <Button
                          disabled={isPending}
                          onClick={() =>
                            callAction(post.id, "mark-posted", { publishedUrl: publishedUrl || undefined })
                          }
                          size="sm"
                        >
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          Confirm posted
                        </Button>
                        <Button
                          onClick={() => {
                            setMarkingId(null);
                            setPublishedUrl("");
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        onClick={() => copyPost(post)}
                        size="sm"
                        variant="outline"
                      >
                        {copiedId === post.id ? (
                          <CheckCircle2 className="size-4 text-emerald-400" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        {copiedId === post.id ? "Copied!" : "Copy post"}
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a
                          href="https://www.linkedin.com/feed/"
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="size-4" />
                          Open LinkedIn
                        </a>
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() => {
                          setMarkingId(post.id);
                          setPublishedUrl("");
                        }}
                        size="sm"
                      >
                        <CheckCircle2 className="size-4" />
                        Mark as posted
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() => callAction(post.id, "cancel")}
                        size="sm"
                        variant="outline"
                      >
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                        Cancel
                      </Button>
                    </div>
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
