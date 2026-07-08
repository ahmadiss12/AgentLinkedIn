import { NextResponse } from "next/server";
import { preferencesUpdateSchema } from "@/core/settings-models";
import { getPreferences, updatePreferences } from "@/server/application/settings-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prefs = await getPreferences();
    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load preferences.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let update;

  try {
    update = preferencesUpdateSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Body did not match the preferences schema." },
      { status: 400 },
    );
  }

  try {
    const prefs = await updatePreferences(update);
    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save preferences.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
