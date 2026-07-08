import "server-only";

import type { NotificationView } from "@/core/notification-models";

export interface NotificationRepository {
  syncDuePostNotifications(userId: string): Promise<number>;
  listNotifications(userId: string, limit: number): Promise<NotificationView[]>;
  countUnread(userId: string): Promise<number>;
  markRead(notificationId: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}
