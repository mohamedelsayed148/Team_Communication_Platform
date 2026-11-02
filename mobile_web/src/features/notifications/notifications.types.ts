import type { TaskStatus } from "../tasks/tasks.types";

export interface NotificationTask {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface AppNotification {
  id: string;
  userId: string;
  taskId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  task: NotificationTask | null;
}

export interface NotificationsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  data: AppNotification[];
  pagination: NotificationsPagination;
}

export interface GetNotificationsFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export interface MarkNotificationAsReadResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    isRead: boolean;
    readAt: string | null;
  };
}

export interface MarkAllNotificationsAsReadResponse {
  success: boolean;
  message: string;
  data: {
    updatedCount: number;
  };
}
