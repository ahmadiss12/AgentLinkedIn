"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const TOPIC_CATEGORIES = [
  "computer_science",
  "software_engineering",
  "ai",
  "cybersecurity",
  "developer_tools",
  "programming_languages",
  "open_source",
  "cloud_computing",
  "data_engineering",
  "emerging_tech",
] as const;

type PreferencesForm = {
  preferredTopics: string[];
  blockedTopics: string[];
  tone: string;
  postLength: string;
  hashtagStyle: string;
  postingFrequency: string;
  contentFocus: string;
  requireApprovalBeforePublishing: boolean;
};

export function SettingsForm({ initial }: { initial: PreferencesForm }) {
  const router = useRouter();
  const [form, setForm] = useState<PreferencesForm>(initial);
  const [blockedText, setBlockedText] = useState(initial.blockedTopics.join(", "));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(category: string) {
    setSaved(false);
    setForm((current) => ({
      ...current,
      preferredTopics: current.preferredTopics.includes(category)
        ? current.preferredTopics.filter((item) => item !== category)
        : [...current.preferredTopics, category],
    }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          blockedTopics: blockedText
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Save failed with status ${response.status}`);
      }

      setSaved(true);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Card className="rounded-md border-destructive/40">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Writing style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Input
                id="tone"
                onChange={(event) => {
                  setSaved(false);
                  setForm({ ...form, tone: event.target.value });
                }}
                placeholder="professional, curious, accessible"
                value={form.tone}
              />
              <p className="text-xs text-muted-foreground">
                Passed to the AI when it writes drafts.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Post length</Label>
                <Select
                  onValueChange={(value) => {
                    setSaved(false);
                    setForm({ ...form, postLength: value });
                  }}
                  value={form.postLength}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (~60-100 words)</SelectItem>
                    <SelectItem value="medium">Medium (~120-180 words)</SelectItem>
                    <SelectItem value="long">Long (~200-280 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hashtag style</Label>
                <Select
                  onValueChange={(value) => {
                    setSaved(false);
                    setForm({ ...form, hashtagStyle: value });
                  }}
                  value={form.hashtagStyle}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal (2-3)</SelectItem>
                    <SelectItem value="balanced">Balanced (3-5)</SelectItem>
                    <SelectItem value="expanded">Expanded (5-8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Content focus</Label>
                <Select
                  onValueChange={(value) => {
                    setSaved(false);
                    setForm({ ...form, contentFocus: value });
                  }}
                  value={form.contentFocus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner_friendly">Beginner friendly</SelectItem>
                    <SelectItem value="advanced_technical">Advanced technical</SelectItem>
                    <SelectItem value="career_oriented">Career oriented</SelectItem>
                    <SelectItem value="industry_trend">Industry trend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Posting frequency</Label>
                <Select
                  onValueChange={(value) => {
                    setSaved(false);
                    setForm({ ...form, postingFrequency: value });
                  }}
                  value={form.postingFrequency}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="3_per_week">3 per week</SelectItem>
                    <SelectItem value="2_per_week">2 per week</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Informational for now — used once auto-scheduling exists.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Preferred categories</Label>
              <p className="text-xs text-muted-foreground">
                Topics in these categories get a small relevance boost during discovery.
              </p>
              <div className="flex flex-wrap gap-2">
                {TOPIC_CATEGORIES.map((category) => {
                  const active = form.preferredTopics.includes(category);

                  return (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      type="button"
                    >
                      <Badge variant={active ? "default" : "outline"}>
                        {category.replaceAll("_", " ")}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blocked">Blocked topics</Label>
              <Input
                id="blocked"
                onChange={(event) => {
                  setSaved(false);
                  setBlockedText(event.target.value);
                }}
                placeholder="crypto, web3, nft (comma separated)"
                value={blockedText}
              />
              <p className="text-xs text-muted-foreground">
                Discovery skips candidates whose title or summary contains these words.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Require approval before publishing</p>
                <p className="text-xs text-muted-foreground">
                  Kept on — nothing is ever posted without your review.
                </p>
              </div>
              <Switch
                checked={form.requireApprovalBeforePublishing}
                disabled
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={saving} onClick={save}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save preferences
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
            <CheckCircle2 className="size-4" />
            Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}
