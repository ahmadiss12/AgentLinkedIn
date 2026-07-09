import "server-only";

import { createNotificationRepository } from "@/server/repositories";

export class NotificationService {
  private readonly repository = createNotificationRepository();

  async getInbox(userId: string, limit = 20) {
    // Creating "post due" notifications lazily on read keeps this working
    // without a background job: any page load that shows the bell also
    // notices newly due scheduled posts.
    await this.repository.syncDuePostNotifications(userId);

    const [notifications, unread] = await Promise.all([
      this.repository.listNotifications(userId, limit),
      this.repository.countUnread(userId),
    ]);

    return { notifications, unread };
  }

  async markRead(userId: string, notificationId: string) {
    await this.repository.markRead(notificationId, userId);
  }

  async markAllRead(userId: string) {
    await this.repository.markAllRead(userId);
  }
}

export async function getNotificationInbox(userId: string, limit = 20) {
  return new NotificationService().getInbox(userId, limit);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return new NotificationService().markRead(userId, notificationId);
}

export async function markAllNotificationsRead(userId: string) {
  return new NotificationService().markAllRead(userId);
}
