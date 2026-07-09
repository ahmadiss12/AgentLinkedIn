import { NextResponse } from "next/server";
import { markNotificationRead } from "@/server/application/notification-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { notificationId } = await params;

  try {
    await markNotificationRead(userId, notificationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark as read.";
    const status = message === "Notification not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
