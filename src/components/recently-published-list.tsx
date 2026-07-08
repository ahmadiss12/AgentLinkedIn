import { CheckCircle2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PublishedPost = {
  id: string;
  draftTitle: string;
  publishedAt: string;
  publishedUrl: string | null;
};

export function RecentlyPublishedList({ posts }: { posts: PublishedPost[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Recently published ({posts.length})</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Posts you marked as posted land here — the full record lives on the History page.
        </p>
      </div>
      {posts.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nothing published yet — scheduled posts move here after you mark them as posted.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {posts.map((post) => (
            <Card className="rounded-md" key={post.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{post.draftTitle}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="secondary">
                    <CheckCircle2 className="size-3" />
                    posted
                  </Badge>
                  <Badge variant="outline">{new Date(post.publishedAt).toLocaleString()}</Badge>
                  {post.publishedUrl ? (
                    <Button asChild className="h-6 px-2" size="sm" variant="outline">
                      <a href={post.publishedUrl} rel="noreferrer" target="_blank">
                        <ExternalLink className="size-3" />
                        View
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
