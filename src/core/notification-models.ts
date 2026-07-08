import { z } from "zod";

export const notificationStatusSchema = z.enum(["unread", "read", "dismissed"]);

export const notificationViewSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  status: notificationStatusSchema,
  createdAt: z.date(),
});

export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
export type NotificationView = z.infer<typeof notificationViewSchema>;
