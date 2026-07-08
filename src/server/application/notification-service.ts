import "server-only";

import {
  createDraftRepository,
  createNotificationRepository,
} from "@/server/repositories";

export class NotificationService {
  private readonly repository = createNotificationRepository();
  private readonly draftRepository = createDraftRepository();

  async getInbox(limit = 20) {
    const userId = await this.draftRepository.getOrCreateDefaultUser();

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

  async markRead(notificationId: string) {
    const userId = await this.draftRepository.getOrCreateDefaultUser();
    await this.repository.markRead(notificationId, userId);
  }

  async markAllRead() {
    const userId = await this.draftRepository.getOrCreateDefaultUser();
    await this.repository.markAllRead(userId);
  }
}

export async function getNotificationInbox(limit = 20) {
  return new NotificationService().getInbox(limit);
}

export async function markNotificationRead(notificationId: string) {
  return new NotificationService().markRead(notificationId);
}

export async function markAllNotificationsRead() {
  return new NotificationService().markAllRead();
}
