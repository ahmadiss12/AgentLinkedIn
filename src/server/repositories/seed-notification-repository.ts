import "server-only";

import type { NotificationRepository } from "@/server/repositories/notification-repository";

export class SeedNotificationRepository implements NotificationRepository {
  async syncDuePostNotifications() {
    return 0;
  }

  async listNotifications() {
    return [];
  }

  async countUnread() {
    return 0;
  }

  async markRead() {
    throw new Error("Connect a database to use notifications.");
  }

  async markAllRead() {
    return;
  }
}
