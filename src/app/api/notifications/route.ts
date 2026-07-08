import { NextResponse } from "next/server";
import { getNotificationInbox } from "@/server/application/notification-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const inbox = await getNotificationInbox(20);
    return NextResponse.json(inbox);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
