import { NextResponse } from "next/server";
import { preferencesUpdateSchema } from "@/core/settings-models";
import { getPreferences, updatePreferences } from "@/server/application/settings-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const prefs = await getPreferences(userId);
    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load preferences.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
    const prefs = await updatePreferences(userId, update);
    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save preferences.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
