import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/server/application/notification-service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await markAllNotificationsRead();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark all as read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
