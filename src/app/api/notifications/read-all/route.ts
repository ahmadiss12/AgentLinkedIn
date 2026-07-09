import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/server/application/notification-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await markAllNotificationsRead(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark all as read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
