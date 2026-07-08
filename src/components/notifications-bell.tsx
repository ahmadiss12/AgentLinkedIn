"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  status: "unread" | "read" | "dismissed";
  createdAt: string;
};

const REFRESH_INTERVAL_MS = 60_000;

export function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");

      if (!response.ok) {
        return;
      }

      const json = await response.json();
      setItems(json.notifications ?? []);
      setUnread(json.unread ?? 0);
    } catch {
      // Silently keep the last known state; the next poll retries.
    }
  }, []);

  useEffect(() => {
    // setState only happens after the fetch resolves, so this cannot
    // cascade renders synchronously — schedule it outside the effect body
    // to satisfy react-hooks/set-state-in-effect.
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);

  async function open(notification: NotificationItem) {
    if (notification.status === "unread") {
      await fetch(`/api/notifications/${notification.id}/read`, { method: "POST" });
      void load();
    }

    if (notification.kind === "post_due") {
      router.push("/schedule");
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    void load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="relative" size="icon" variant="ghost">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 ? (
            <button
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
              type="button"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing yet — you&apos;ll be notified here when a scheduled post is due.
          </div>
        ) : (
          items.map((notification) => (
            <DropdownMenuItem
              className={cn(
                "flex cursor-pointer flex-col items-start gap-1 py-2",
                notification.status === "unread" && "bg-muted/60",
              )}
              key={notification.id}
              onClick={() => void open(notification)}
            >
              <div className="flex w-full items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    notification.status === "unread" ? "bg-destructive" : "bg-border",
                  )}
                />
                <span className="text-sm font-medium">{notification.title}</span>
              </div>
              <p className="line-clamp-2 pl-3.5 text-xs text-muted-foreground">
                {notification.body}
              </p>
              <p className="pl-3.5 text-[10px] text-muted-foreground">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
