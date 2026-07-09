import { NextResponse } from "next/server";
import { getNotificationInbox } from "@/server/application/notification-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const inbox = await getNotificationInbox(userId, 20);
    return NextResponse.json(inbox);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
