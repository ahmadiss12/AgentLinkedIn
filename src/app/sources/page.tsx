import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { SourceLibraryList } from "@/components/source-library-list";
import { listSourceOverviews } from "@/server/application/topic-discovery-service";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await listSourceOverviews();
  const enabledCount = sources.filter((source) => source.enabled).length;

  return (
    <AppShell>
      <PageHeading
        description={`The agent monitors ${enabledCount} of ${sources.length} feeds during discovery. Disabled sources are skipped on the next run.`}
        title="Source Library"
      />
      <SourceLibraryList
        sources={sources.map((source) => ({
          ...source,
          lastFetchedAt: source.lastFetchedAt ? source.lastFetchedAt.toISOString() : null,
        }))}
      />
    </AppShell>
  );
}
