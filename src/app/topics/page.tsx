import { AppShell } from "@/components/app-shell";
import { DiscoveryRunPanel } from "@/components/discovery-run-panel";
import { LearningIdeasPanel } from "@/components/learning-ideas-panel";
import { RecentTopicsList } from "@/components/recent-topics-list";
import { ResearchBriefPanel } from "@/components/research-brief-panel";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getDiscoveryOverview,
  listRecentTopics,
} from "@/server/application/topic-discovery-service";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const [overview, recentTopics] = await Promise.all([
    getDiscoveryOverview(),
    listRecentTopics(30),
  ]);

  return (
    <AppShell>
      <PageHeading
        description="The discovery agent watches trusted technical sources, scores fresh developments, and prepares topic candidates before any LinkedIn draft is generated."
        title="Discovered Topics"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="rounded-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trusted sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-3xl font-semibold">
              {overview.sourceCount}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Persistence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={overview.persistenceEnabled ? "secondary" : "outline"}>
              {overview.persistenceEnabled ? "Database connected" : "Preview mode"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Safety rule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Review required</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <DiscoveryRunPanel />
          <LearningIdeasPanel />
          <ResearchBriefPanel />
          <RecentTopicsList
            topics={recentTopics.map((topic) => ({
              id: topic.id,
              title: topic.title,
              category: topic.category,
              type: topic.type,
              status: topic.status,
              relevanceScore: topic.relevanceScore,
              riskLevel: topic.riskLevel,
              sources: topic.sources,
            }))}
          />
        </div>

        <aside className="space-y-3">
          <h2 className="text-lg font-semibold">Source catalog</h2>
          <div className="grid gap-3">
            {overview.sources.map((source) => (
              <Card className="rounded-md" key={source.url}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-sm">{source.name}</CardTitle>
                    <Badge variant="outline">{source.trustLevel}/5</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {source.type.replaceAll("_", " ")}
                    </Badge>
                    {source.categories.slice(0, 2).map((category) => (
                      <Badge key={category} variant="outline">
                        {category.replaceAll("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
