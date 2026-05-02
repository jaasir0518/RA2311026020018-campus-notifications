export type NotificationType = "Placement" | "Result" | "Event";

export type NotificationItem = {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
};

export type RankedNotification = NotificationItem & {
  priorityScore: number;
  recencyRank: number;
};

export type NotificationApiResponse = {
  notifications: NotificationItem[];
  total?: number;
  page?: number;
  limit?: number;
};
