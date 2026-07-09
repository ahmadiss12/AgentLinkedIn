import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { SettingsForm } from "@/components/settings-form";
import { getPreferences } from "@/server/application/settings-service";
import { requireCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireCurrentUserId();
  const preferences = await getPreferences(userId);

  return (
    <AppShell>
      <PageHeading
        description="How the agent writes and which topics it chases. Saved to the database and applied to the next discovery run and draft generation."
        title="Preferences"
      />
      <SettingsForm initial={preferences} />
    </AppShell>
  );
}
