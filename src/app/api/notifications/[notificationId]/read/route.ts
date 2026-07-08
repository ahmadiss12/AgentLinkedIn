import { NextResponse } from "next/server";
import { markNotificationRead } from "@/server/application/notification-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const { notificationId } = await params;

  try {
    await markNotificationRead(notificationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark as read.";
    const status = message === "Notification not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
