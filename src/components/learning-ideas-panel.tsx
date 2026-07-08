"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, GraduationCap, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SuggestResult = {
  created: { id: string; title: string }[];
  remainingInCatalog: number;
};

export function LearningIdeasPanel() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/learning/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count: 3 }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Suggestion failed with status ${response.status}`);
      }

      setResult(json);
      router.refresh();
    } catch (suggestError) {
      setError(
        suggestError instanceof Error ? suggestError.message : "Failed to suggest topics.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="size-4" />
          Learning topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Not everything has to be news. Get evergreen concept ideas (caching, pagination,
          indexes…) that become simple teaching posts — problem, solution, rule of thumb.
        </p>
        <Button disabled={isRunning} onClick={suggest} size="sm">
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GraduationCap className="size-4" />
          )}
          Get 3 learning ideas
        </Button>

        {error ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-2">
            {result.created.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every concept in the catalog has already been suggested — nothing new to add.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Added to the topic list below — generate briefs to make them draft-ready:
                </p>
                <ul className="space-y-1">
                  {result.created.map((item) => (
                    <li className="text-sm" key={item.id}>
                      • {item.title}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Badge variant="outline">{result.remainingInCatalog} unused ideas left</Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
